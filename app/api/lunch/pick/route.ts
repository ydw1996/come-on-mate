import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/lunch/pick — 오늘의 픽 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const 오늘 = new Date().toISOString().split('T')[0]

  const { data: pick } = await supabase
    .from('lunch_picks')
    .select('*, lunch_places(*)')
    .eq('date', 오늘)
    .eq('recommended_by', user.id)
    .maybeSingle()

  return NextResponse.json({ pick: pick ?? null })
}

// POST /api/lunch/pick — 오늘의 점심 선택 저장 (UPSERT)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { placeId, companions = [] } = await request.json()
  if (!placeId) return NextResponse.json({ error: '식당을 선택해주세요.' }, { status: 400 })

  const 오늘 = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('lunch_picks')
    .upsert(
      {
        date: 오늘,
        place_id: placeId,
        recommended_by: user.id,
        companions,
      },
      { onConflict: 'date,recommended_by' }
    )
    .select('*, lunch_places(*)')
    .single()

  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  return NextResponse.json(data)
}
