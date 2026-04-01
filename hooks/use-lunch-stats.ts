'use client'

import { useQuery } from '@tanstack/react-query'
import type { LunchPick, LunchTop5Item } from '@/types'

interface LunchStats {
  myPicks: (LunchPick & { lunch_places: NonNullable<LunchPick['lunch_places']> })[]
  top5: LunchTop5Item[]
}

export function useLunchStats(period: 'week' | 'month') {
  return useQuery({
    queryKey: ['lunch', 'stats', period],
    queryFn: async (): Promise<LunchStats> => {
      const res = await fetch(`/api/lunch/stats?period=${period}`)
      if (!res.ok) throw new Error('통계 조회 실패')
      return res.json()
    },
  })
}
