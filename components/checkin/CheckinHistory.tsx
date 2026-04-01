'use client'

import { useQuery } from '@tanstack/react-query'
import type { Checkin } from '@/types'
import { Badge } from '@/components/ui/badge'

async function fetchWeekCheckins(): Promise<Checkin[]> {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  const from = monday.toISOString().split('T')[0]

  const res = await fetch(`/api/checkin/week?from=${from}`)
  if (!res.ok) return []
  return res.json()
}

export function CheckinHistory() {
  const { data: records = [] } = useQuery({
    queryKey: ['checkins', 'week'],
    queryFn: fetchWeekCheckins,
  })

  const groupedByDate = records.reduce<Record<string, Checkin[]>>((acc, item) => {
    const date = new Date(item.checked_at).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  if (Object.keys(groupedByDate).length === 0) {
    return <p className="text-sm text-muted-foreground">이번주 출퇴근 기록이 없습니다.</p>
  }

  return (
    <div className="space-y-2">
      {Object.entries(groupedByDate).map(([date, items]) => {
        const checkIn = items.find((r) => r.type === 'in')
        const checkOut = items.find((r) => r.type === 'out')

        return (
          <div key={date} className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
            <span className="font-medium">{date}</span>
            <div className="flex gap-3 text-muted-foreground">
              <span>
                출근:{' '}
                <span className="text-foreground">
                  {checkIn
                    ? new Date(checkIn.checked_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </span>
              <span>
                퇴근:{' '}
                <span className="text-foreground">
                  {checkOut
                    ? new Date(checkOut.checked_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </span>
              {checkIn && checkOut && (
                <Badge variant="secondary">
                  {calcWorkDuration(checkIn.checked_at, checkOut.checked_at)}
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function calcWorkDuration(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}시간 ${minutes}분`
}
