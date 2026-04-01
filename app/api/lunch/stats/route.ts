import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/lunch/stats?period=week|month
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'week'

  const now = new Date()
  let startDate: string

  if (period === 'week') {
    // 이번 주 월요일
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    startDate = monday.toISOString().split('T')[0]
  } else {
    // 이번 달 1일
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  // 내 픽 (내가 기록한 것 + 동행자로 포함된 것)
  const { data: myPicks, error: picksError } = await supabase
    .from('lunch_picks')
    .select('*, lunch_places(*)')
    .or(`recommended_by.eq.${user.id},companions.cs.{${user.id}}`)
    .gte('date', startDate)
    .order('date', { ascending: false })

  if (picksError) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  // 팀 TOP5 (RPC)
  const { data: top5, error: top5Error } = await supabase.rpc('lunch_top5', {
    start_date: startDate,
  })

  if (top5Error) return NextResponse.json({ error: '통계 조회 실패' }, { status: 500 })

  return NextResponse.json({ myPicks: myPicks ?? [], top5: top5 ?? [] })
}
