import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/lunch/pick — 오늘의 점심 선택 저장
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { placeId, recommendedBy } = await request.json()
  const 오늘 = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('lunch_picks')
    .insert({
      date: 오늘,
      place_id: placeId,
      recommended_by: recommendedBy ?? user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  return NextResponse.json(data)
}
