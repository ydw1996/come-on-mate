import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/todos/:id/toggle — 완료 토글
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id } = await params

  // 현재 상태 조회
  const { data: 현재 } = await supabase
    .from('todos')
    .select('is_done')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!현재) return NextResponse.json({ error: '찾을 수 없음' }, { status: 404 })

  const { data, error } = await supabase
    .from('todos')
    .update({ is_done: !현재.is_done })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  return NextResponse.json(data)
}
