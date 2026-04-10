import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { LunchPlaceWithLastPick } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { places } = await request.json() as { places: LunchPlaceWithLastPick[] }
  if (!places?.length) return NextResponse.json({ error: '식당 목록이 없습니다.' }, { status: 400 })

  const placeList = places
    .map((p, i) => {
      const cat = p.category?.split('>').pop()?.trim() ?? ''
      const lastVisit = p.last_picked_at ? `마지막 방문: ${p.last_picked_at}` : '아직 방문 없음'
      return `${i + 1}. ${p.name}${cat ? ` (${cat})` : ''} - ${lastVisit}`
    })
    .join('\n')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `다음은 점심 식당 목록입니다:\n${placeList}\n\n오늘 점심으로 가장 적합한 곳 한 곳을 추천해주세요. 최근에 방문하지 않은 곳을 우선 고려하세요. JSON으로만 응답: {"name": "식당명", "reason": "추천 이유 1-2문장"}`,
      },
    ],
  })

  const text = completion.choices[0].message.content ?? ''
  try {
    return NextResponse.json(JSON.parse(text))
  } catch {
    return NextResponse.json({ error: '응답 파싱 실패' }, { status: 500 })
  }
}
