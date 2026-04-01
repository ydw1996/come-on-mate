import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/checkin/week?from=2026-03-31
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('checked_at', `${from}T00:00:00`)
    .order('checked_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }

  return NextResponse.json(data)
}
