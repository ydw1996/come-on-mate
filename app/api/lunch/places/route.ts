import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 장소검색 } from '@/lib/naver-maps'

// GET /api/lunch/places
// ?mode=list (기본) → DB 등록 목록 + 마지막 픽 날짜
// ?mode=search&query=한식 → 네이버 API 실시간 검색
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'list'

  if (mode === 'search') {
    const query = searchParams.get('query') ?? '맛집'
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    try {
      let results

      if (lat && lng) {
        // 동(suburb) + 구(city_district) + 일반 — 3개 쿼리 병렬, 중복 제거 후 최대 15개
        const { dong, gu } = await reverseGeocode(parseFloat(lat), parseFloat(lng))
        const queries = [
          dong ? `${dong} ${query}` : null,
          gu   ? `${gu} ${query}`   : null,
          query,
        ].filter((q): q is string => q !== null && q !== query || true)
          // query 자체는 항상 포함, 중복 제거
          .filter((q, i, arr) => arr.indexOf(q) === i)

        const batches = await Promise.all(
          queries.map((q) => 장소검색(q, 5, 3).catch(() => []))
        )
        const seen = new Set<string>()
        results = batches.flat().filter((p) => {
          const key = p.mapx + p.mapy
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).slice(0, 15)
      } else {
        results = await 장소검색(query, 5, 3)
      }

      return NextResponse.json({ results })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '네이버 검색 실패'
      console.error('[lunch/places search]', e)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  // mode=list: DB에서 등록된 식당 + 마지막 픽 날짜 조회
  const { data: places, error } = await supabase
    .from('lunch_places')
    .select('*, profiles!added_by(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  // 각 장소의 마지막 픽 날짜 조회
  const placeIds = places.map((p) => p.id)
  const { data: lastPicks } = await supabase
    .from('lunch_picks')
    .select('place_id, date')
    .in('place_id', placeIds.length > 0 ? placeIds : ['00000000-0000-0000-0000-000000000000'])
    .order('date', { ascending: false })

  const lastPickMap: Record<string, string> = {}
  for (const pick of lastPicks ?? []) {
    if (!lastPickMap[pick.place_id]) {
      lastPickMap[pick.place_id] = pick.date
    }
  }

  const placesWithLastPick = places.map((p) => ({
    ...p,
    last_picked_at: lastPickMap[p.id] ?? null,
  }))

  return NextResponse.json({ places: placesWithLastPick })
}

// POST /api/lunch/places — 네이버 검색 결과를 DB에 저장
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { name, category, naver_place_id, address } = await request.json()
  if (!name) return NextResponse.json({ error: '식당명은 필수입니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('lunch_places')
    .insert({ name, category, naver_place_id, address, added_by: user.id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 식당입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// Nominatim 역지오코딩 — 좌표 → 동(suburb) + 구(city_district)
async function reverseGeocode(lat: number, lng: number): Promise<{ dong: string | null; gu: string | null }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'come-on-mate/1.0 (internal tool)' }, cache: 'no-store' }
    )
    if (!res.ok) return { dong: null, gu: null }
    const data = await res.json()
    const { suburb, city_district } = (data.address ?? {}) as Record<string, string>
    return { dong: suburb || null, gu: city_district || null }
  } catch {
    return { dong: null, gu: null }
  }
}
