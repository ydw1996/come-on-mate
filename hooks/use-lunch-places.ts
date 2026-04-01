'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LunchPlaceWithLastPick, NaverPlace } from '@/types'

async function fetchPlaces(): Promise<LunchPlaceWithLastPick[]> {
  const res = await fetch('/api/lunch/places?mode=list')
  if (!res.ok) throw new Error('조회 실패')
  const json = await res.json()
  return json.places
}

async function searchNaverPlaces(query: string): Promise<NaverPlace[]> {
  const res = await fetch(`/api/lunch/places?mode=search&query=${encodeURIComponent(query)}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? '검색 실패')
  return json.results
}

export function useLunchPlaces() {
  const queryClient = useQueryClient()

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['lunch', 'places'],
    queryFn: fetchPlaces,
  })

  const { mutateAsync: addPlace, isPending: isAdding } = useMutation({
    mutationFn: async (data: Pick<LunchPlaceWithLastPick, 'name' | 'category' | 'naver_place_id' | 'address'>) => {
      const res = await fetch('/api/lunch/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '추가 실패')
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lunch', 'places'] }),
  })

  const { mutate: removePlace } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lunch/places/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lunch', 'places'] }),
  })

  return { places, isLoading, searchNaverPlaces, addPlace, isAdding, removePlace }
}
