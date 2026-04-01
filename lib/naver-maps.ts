// 네이버 지도 API 클라이언트 (서버 전용)
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!

export interface NaverPlace {
  title: string
  link: string
  category: string
  description: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
}

// 장소 검색
export async function 장소검색(query: string, display = 10): Promise<NaverPlace[]> {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 60 * 60 }, // 1시간 캐시
  })

  if (!res.ok) {
    throw new Error('네이버 지도 API 호출 실패')
  }

  const data = await res.json()
  return data.items as NaverPlace[]
}
