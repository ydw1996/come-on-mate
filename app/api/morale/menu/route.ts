import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai'

// POST /api/morale/menu — 메뉴판 사진 업로드 + AI 분석
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('menu') as File
  const cafeName = formData.get('cafeName') as string

  if (!file || !cafeName) {
    return NextResponse.json({ error: '파일과 카페명이 필요합니다.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Supabase Storage 업로드
  const fileName = `menus/${cafeName}/${Date.now()}_${file.name}`
  await supabase.storage.from('morale').upload(fileName, buffer, { contentType: file.type })
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
          { type: 'text', text: '이 카페 메뉴판에서 메뉴명, 가격, 카테고리를 추출해주세요. JSON 배열로만 반환해주세요. 예시: [{"item_name": "아메리카노", "price": 4500, "category": "커피"}]' },
        ],
      }],
    })

    const text = result.choices[0].message.content ?? ''
    let menuItems: { item_name: string; price: number; category: string }[] = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) menuItems = JSON.parse(jsonMatch[0])
    } catch {
      menuItems = []
    }

    if (menuItems.length > 0) {
      const insertData = menuItems.map((m) => ({
        cafe_name: cafeName,
        item_name: m.item_name,
        price: m.price,
        category: m.category,
        image_url: publicUrl,
      }))
      await supabase.from('cafe_menus').upsert(insertData, { onConflict: 'cafe_name,item_name' })
    }

    return NextResponse.json({ items: menuItems, count: menuItems.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
