import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('receipt') as File
  const menuFile = formData.get('menu') as File | null
  if (!file) return NextResponse.json({ error: '영수증 파일이 없습니다.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const receiptDataUrl = `data:${file.type};base64,${buffer.toString('base64')}`

  let menuDataUrl: string | null = null
  if (menuFile) {
    const mb = Buffer.from(await menuFile.arrayBuffer())
    menuDataUrl = `data:${menuFile.type};base64,${mb.toString('base64')}`
  }

  // Supabase Storage 업로드 (실패해도 계속)
  let publicUrl: string | null = null
  const fileName = `receipts/${user.id}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage.from('morale').upload(fileName, buffer, { contentType: file.type })
  if (uploadError) {
    console.warn('[morale/receipt] 스토리지 업로드 실패:', uploadError.message)
  } else {
    publicUrl = supabase.storage.from('morale').getPublicUrl(fileName).data.publicUrl
  }

  try {
    const openai = getOpenAI()

    // ── Step 1: 영수증만 먼저 분석 ──
    const step1 = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: receiptDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `한국 카페 영수증입니다. 이미지가 회전/구겨져 있을 수 있습니다.
영수증에서 아래 정보만 읽어서 JSON으로 반환하세요. 가격은 아직 계산하지 마세요.

{
  "place": "상호명 (영수증 맨 위 가게 이름 + 지점명, 예: 매머드익스프레스 홍대경의선숲길점)",
  "date": "YYYY-MM-DD",
  "totalAmount": 최종결제금액(숫자),
  "items": [
    {"item": "영수증에 적힌 메뉴명 그대로", "quantity": 수량},
    ...
  ]
}

규칙:
- place: 영수증 상단 상호명. 한글 OCR 오류 주의. 예) "매머드" "익스프레스" 같은 브랜드명 정확히.
- date: 영수증의 날짜. 연도 없으면 2026 가정.
- totalAmount: "합계" "결제금액" "받을금액" 중 최종 숫자. 공급가액(VAT제외) 절대 사용 금지.
- items: 영수증 주문 줄 하나하나 모두 읽기. 수량 표시 없으면 1.
  메뉴명은 영수증에 적힌 그대로 (예: "머스켓 그린티 ICE", "카페 아메리카노 HOT SIZE M").
  절대 빠뜨리지 말 것 — 총 수량 합이 영수증 합계 수량과 맞아야 함.
  주의: "샷추가", "휘핑크림추가" 등 옵션/추가 항목은 별도 item으로 만들지 말고
  직전 메뉴 item명에 "(샷추가)" 형태로 포함시킬 것.
  예) "아메리카노" 다음 줄에 "샷추가" → item: "아메리카노 (샷추가)", quantity: 1`,
          },
        ],
      }],
    })

    let place = ''
    let date: string | null = null
    let totalAmount = 0
    let items: { item: string; quantity: number; unitPrice: number }[] = []

    try {
      const p1 = JSON.parse(step1.choices[0].message.content ?? '{}')
      place = p1.place ?? ''
      date = p1.date ?? null
      totalAmount = p1.totalAmount ?? 0
      const rawItems: { item: string; quantity: number }[] = p1.items ?? []
      console.log('[morale/receipt] Step1 items:', rawItems)

      // ── Step 2: 메뉴판으로 가격 조회 (메뉴판 있을 때만) ──
      if (menuDataUrl && rawItems.length > 0) {
        const itemList = rawItems.map((it, i) => `${i + 1}. "${it.item}" (수량: ${it.quantity})`).join('\n')

        const step2 = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: menuDataUrl, detail: 'high' } },
              {
                type: 'text',
                text: `이 메뉴판에서 아래 메뉴들의 가격을 찾아주세요.

[찾을 메뉴 목록]
${itemList}

총 결제금액: ${totalAmount.toLocaleString()}원

아래 JSON으로 반환:
{
  "prices": [
    {"index": 1, "menuName": "메뉴판의 정확한 이름", "unitPrice": 단가},
    ...
  ]
}

규칙:
- index는 위 목록 번호와 동일
- menuName: 메뉴판에서 찾은 정확한 이름 (없으면 입력된 이름 그대로)
- unitPrice: 메뉴판 가격 (VAT 포함 소비자가). SIZE M/S/L 구분 있으면 해당 사이즈.
  "SIZE M" → M 가격, "SIZE S" → S 가격, 없으면 M 기준.
- 메뉴명 매칭 시 유사한 표기 허용:
  "머스캣"="머스켓", "인크레디블"="인크레디불", "카페 아메리카노"≠"카페 라떼"
- 메뉴판에서 못 찾으면 unitPrice: 0 (나중에 총액 기준으로 계산)
- 숫자만, 쉼표 없이`,
              },
            ],
          }],
        })

        try {
          const p2 = JSON.parse(step2.choices[0].message.content ?? '{}')
          const prices: { index: number; menuName: string; unitPrice: number }[] = p2.prices ?? []
          console.log('[morale/receipt] Step2 prices:', prices)

          items = rawItems.map((it, i) => {
            const matched = prices.find((p) => p.index === i + 1)
            let unitPrice = matched?.unitPrice ?? 0
            // 메뉴판에서 못 찾은 경우 총액 / 총수량으로 균등 배분
            if (!unitPrice) {
              const totalQty = rawItems.reduce((s, r) => s + (r.quantity ?? 1), 0)
              unitPrice = Math.round(totalAmount / totalQty / 10) * 10
            }
            return {
              item: matched?.menuName || it.item,
              quantity: it.quantity ?? 1,
              unitPrice: Math.round(unitPrice / 10) * 10,
            }
          })
        } catch {
          // Step2 파싱 실패 → totalAmount 균등 배분
          const totalQty = rawItems.reduce((s, r) => s + (r.quantity ?? 1), 0)
          items = rawItems.map((it) => ({
            item: it.item,
            quantity: it.quantity ?? 1,
            unitPrice: Math.round(totalAmount / totalQty / 10) * 10,
          }))
        }
      } else {
        // 메뉴판 없음 → 총액 균등 배분
        const totalQty = rawItems.reduce((s, r) => s + (r.quantity ?? 1), 0)
        items = rawItems.map((it) => ({
          item: it.item,
          quantity: it.quantity ?? 1,
          unitPrice: totalQty > 0 ? Math.round(totalAmount / totalQty / 10) * 10 : 0,
        }))
      }
    } catch {
      items = []
    }

    return NextResponse.json({ place, date, totalAmount, items, receiptUrl: publicUrl })
  } catch (err) {
    console.error('[morale/receipt] 에러:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
