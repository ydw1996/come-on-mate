import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/lunch/place-image?q=식당명
// 네이버 이미지 검색 → 첫 번째 썸네일 URL 반환
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ thumbnail: null })

  const q = new URL(request.url).searchParams.get('q')
  if (!q) return NextResponse.json({ thumbnail: null })

  const res = await fetch(
    `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(q + ' 음식점')}&display=1&sort=sim&filter=large`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    }
  )

  if (!res.ok) return NextResponse.json({ thumbnail: null })

  const data = await res.json()
  const thumbnail: string | null = data.items?.[0]?.thumbnail ?? null
  return NextResponse.json({ thumbnail })
}
