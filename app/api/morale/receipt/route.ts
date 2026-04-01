import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai'

// POST /api/morale/receipt — 영수증 이미지 AI 분석
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('receipt') as File

  if (!file) {
    return NextResponse.json({ error: '영수증 파일이 없습니다.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Supabase Storage 업로드
  const fileName = `receipts/${user.id}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('morale')
    .upload(fileName, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: '파일 업로드 실패' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('morale').getPublicUrl(fileName)

  try {
    const openai = getOpenAI()
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    const result = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: '이 영수증에서 주문 항목과 가격을 추출해주세요. JSON 배열 형식으로만 반환해주세요. 예시: [{"item": "아메리카노", "price": 4500}, {"item": "카페라떼", "price": 5000}]' },
        ],
      }],
    })

    const text = result.choices[0].message.content ?? ''
    let items = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) items = JSON.parse(jsonMatch[0])
    } catch {
      items = []
    }

    return NextResponse.json({ items, receiptUrl: publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
