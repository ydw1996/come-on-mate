import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 장소검색 } from '@/lib/naver-maps'

// GET /api/lunch/places?query=한식&location=회사주소
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') ?? '맛집'

  const places = await 장소검색(query)
  return NextResponse.json(places)
}
