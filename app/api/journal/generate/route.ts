import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai'

// POST /api/journal/generate — AI 업무일지 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { rawInput, template, project } = await request.json()

  if (!rawInput) {
    return NextResponse.json({ error: '원본 내용을 입력해주세요.' }, { status: 400 })
  }

  const prompt = template
    ? `다음 업무일지 템플릿에 맞게 내용을 채워주세요. 입력된 할일/작업 내용을 보고 형식에 맞게 한국어로 작성해주세요.\n\n[템플릿]\n${template}\n\n[작업 내용]\n${rawInput}`
    : `다음 작업 내용을 바탕으로 업무일지를 작성해주세요. 오늘 날짜, 프로젝트(${project ?? '미지정'}), 작업 내용, 특이사항 형식으로 한국어로 작성해주세요.\n\n[작업 내용]\n${rawInput}`

  try {
    const openai = getOpenAI()
    const result = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = result.choices[0].message.content ?? ''

    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('OpenAI API 오류:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
