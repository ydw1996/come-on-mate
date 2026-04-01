import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/todos — 전체 할일 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/todos — 할일 추가
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { title, description, project, due_date } = await request.json()
  if (!title) return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })

  const { data, error } = await supabase
    .from('todos')
    .insert({ user_id: user.id, title, description, project, due_date })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '추가 실패' }, { status: 500 })
  return NextResponse.json(data)
}
