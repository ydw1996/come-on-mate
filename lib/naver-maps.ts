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

/**
 * 장소 검색 — Naver Local Search API
 * display 최대 5개/요청 (API 스펙 고정)
 * pages 만큼 순차 페이지네이션 후 합산
 */
export async function 장소검색(
  query: string,
  display = 5,
  pages = 1
): Promise<NaverPlace[]> {
  const results: NaverPlace[] = []

  for (let page = 0; page < pages; page++) {
    const start = page * display + 1
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=random`

    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
      cache: 'no-store', // 항상 최신 결과
    })

    if (!res.ok) break

    const data = await res.json()
    const items: NaverPlace[] = data.items ?? []
    results.push(...items)

    if (items.length < display) break // 더 이상 결과 없음
  }

  return results
}
