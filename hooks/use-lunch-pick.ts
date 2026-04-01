'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LunchPick } from '@/types'

export function useLunchPick() {
  const queryClient = useQueryClient()

  const { data: todayPick, isLoading } = useQuery({
    queryKey: ['lunch', 'pick', 'today'],
    queryFn: async (): Promise<(LunchPick & { lunch_places: NonNullable<LunchPick['lunch_places']> }) | null> => {
      const res = await fetch('/api/lunch/pick')
      if (!res.ok) throw new Error('조회 실패')
      const json = await res.json()
      return json.pick
    },
  })

  const { mutate: savePick, isPending: isSaving } = useMutation({
    mutationFn: async (data: { placeId: string; companions: string[] }) => {
      const res = await fetch('/api/lunch/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('저장 실패')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lunch', 'pick', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['lunch', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['lunch', 'places'] })
    },
  })

  return { todayPick, isLoading, savePick, isSaving }
}
