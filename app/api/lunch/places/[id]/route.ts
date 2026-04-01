import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/lunch/places/[id] — 식당 삭제 (등록자 본인만)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { id } = await params

  // 등록자 확인
  const { data: place } = await supabase
    .from('lunch_places')
    .select('added_by')
    .eq('id', id)
    .single()

  if (!place) return NextResponse.json({ error: '식당을 찾을 수 없습니다.' }, { status: 404 })
  if (place.added_by !== user.id) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  const { error } = await supabase.from('lunch_places').delete().eq('id', id)
  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })

  return NextResponse.json({ success: true })
}
