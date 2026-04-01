import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/checkin — 출퇴근 기록
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { type, note } = await request.json()

  if (type !== 'in' && type !== 'out') {
    return NextResponse.json({ error: '올바른 type을 입력해주세요. (in | out)' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('checkins')
    .insert({ user_id: user.id, type, note })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// GET /api/checkin — 오늘 출퇴근 기록 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const 오늘 = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('checked_at', `${오늘}T00:00:00`)
    .order('checked_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
