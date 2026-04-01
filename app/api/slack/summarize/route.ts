import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai'

// POST /api/slack/summarize — 슬랙 채널 메시지 요약
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { channelId, channelName, messages } = await request.json()

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: '요약할 메시지가 없습니다.' }, { status: 400 })
  }

  const messageText = messages
    .map((m: { user: string; text: string }) => `[${m.user}]: ${m.text}`)
    .join('\n')

  try {
    const openai = getOpenAI()
    const result = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{
        role: 'user',
        content: `다음은 슬랙 채널 "${channelName}"의 오늘 대화 내용입니다. 핵심 내용을 한국어로 간결하게 요약해주세요. 중요한 결정사항, 공지, 이슈를 중심으로 3~5개 항목으로 정리해주세요.\n\n${messageText}`,
      }],
    })
    const summary = result.choices[0].message.content ?? ''

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('slack_summaries')
      .upsert(
        { date: today, channel_id: channelId, channel_name: channelName, summary, raw_count: messages.length },
        { onConflict: 'date,channel_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
