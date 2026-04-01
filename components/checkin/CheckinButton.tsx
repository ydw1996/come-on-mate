'use client'

import { useCheckin } from '@/hooks/use-checkin'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, Clock } from 'lucide-react'

export function CheckinButton() {
  const { checkInRecord, checkOutRecord, isCheckinPending, checkIn, checkOut, formatTime } = useCheckin()

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={checkIn}
        disabled={!!checkInRecord || isCheckinPending}
        variant={checkInRecord ? 'secondary' : 'default'}
        className="gap-2"
      >
        <LogIn className="h-4 w-4" />
        {checkInRecord ? `출근 ${formatTime(checkInRecord.checked_at)}` : '출근'}
      </Button>

      <Button
        onClick={checkOut}
        disabled={!checkInRecord || !!checkOutRecord || isCheckinPending}
        variant={checkOutRecord ? 'secondary' : 'outline'}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        {checkOutRecord ? `퇴근 ${formatTime(checkOutRecord.checked_at)}` : '퇴근'}
      </Button>

      {checkInRecord && checkOutRecord && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          {calcWorkDuration(checkInRecord.checked_at, checkOutRecord.checked_at)}
        </span>
      )}
    </div>
  )
}

function calcWorkDuration(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}시간 ${minutes}분`
}
