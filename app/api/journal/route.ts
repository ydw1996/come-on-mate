import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/journal — 업무일지 목록
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/journal — 업무일지 저장
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { date, project, raw_input, generated_content } = await request.json()

  const { data, error } = await supabase
    .from('journals')
    .upsert(
      { user_id: user.id, date, project, raw_input, generated_content },
      { onConflict: 'user_id,date,project' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  return NextResponse.json(data)
}
