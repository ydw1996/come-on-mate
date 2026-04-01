'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Checkin } from '@/types'

async function fetchTodayCheckins(): Promise<Checkin[]> {
  const res = await fetch('/api/checkin')
  if (!res.ok) throw new Error('조회 실패')
  return res.json()
}

async function postCheckin(type: 'in' | 'out'): Promise<Checkin> {
  const res = await fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!res.ok) throw new Error('저장 실패')
  return res.json()
}

export function useCheckin() {
  const queryClient = useQueryClient()

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['checkins', 'today'],
    queryFn: fetchTodayCheckins,
  })

  const { mutate: checkin, isPending: isCheckinPending } = useMutation({
    mutationFn: postCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    },
  })

  const checkInRecord = checkins.find((r) => r.type === 'in')
  const checkOutRecord = checkins.find((r) => r.type === 'out')

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return {
    checkInRecord,
    checkOutRecord,
    isLoading,
    isCheckinPending,
    checkIn: () => checkin('in'),
    checkOut: () => checkin('out'),
    formatTime,
  }
}
