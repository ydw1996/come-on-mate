import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/journal/templates
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('journal_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/journal/templates — 템플릿 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { name, project, template } = await request.json()

  const { data, error } = await supabase
    .from('journal_templates')
    .insert({ name, project, template, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  return NextResponse.json(data)
}
