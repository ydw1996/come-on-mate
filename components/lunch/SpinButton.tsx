'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SpinnerWheel } from './SpinnerWheel'
import { PickRecordDialog } from './PickRecordDialog'
import { useLunchPlaces } from '@/hooks/use-lunch-places'
import { useLunchPick } from '@/hooks/use-lunch-pick'
import type { LunchPlaceWithLastPick } from '@/types'

function calcWeight(lastPickedAt: string | null): number {
  if (!lastPickedAt) return 10
  const daysSince = Math.floor(
    (Date.now() - new Date(lastPickedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.min(10, Math.max(1, daysSince))
}

function weightedRandom(places: LunchPlaceWithLastPick[]): number {
  const weights = places.map((p) => calcWeight(p.last_picked_at))
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return i
  }
  return places.length - 1
}

export function SpinButton() {
  const { places, isLoading } = useLunchPlaces()
  const { todayPick } = useLunchPick()

  const [spinning, setSpinning] = useState(false)
  const [spinDeg, setSpinDeg] = useState(0)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<LunchPlaceWithLastPick | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prevTotalDeg, setPrevTotalDeg] = useState(0)

  function spin() {
    if (spinning || places.length === 0) return

    const idx = weightedRandom(places)
    const sectorAngle = 360 / places.length

    // 12시 방향 기준으로 타겟 섹터 중앙이 오도록 계산
    const targetSectorMid = idx * sectorAngle + sectorAngle / 2
    const toTop = (360 - targetSectorMid) % 360

    // 최소 5바퀴 + 타겟 각도
    const totalDeg = prevTotalDeg + 360 * 5 + toTop

    setTargetIndex(idx)
    setSpinDeg(totalDeg)
    setPrevTotalDeg(totalDeg)
    setSpinning(true)

    setTimeout(() => {
      setSpinning(false)
      setSelectedPlace(places[idx])
      setDialogOpen(true)
    }, 4200)
  }

  if (isLoading) return null

  return (
    <div className="flex flex-col items-center gap-6">
      {todayPick && (
        <div className="text-sm text-muted-foreground bg-muted rounded-lg px-4 py-2">
          오늘은 이미 <strong>{todayPick.lunch_places?.name}</strong>을(를) 기록했어요.
          다시 돌리면 덮어씌워집니다.
        </div>
      )}

      <SpinnerWheel
        places={places}
        spinning={spinning}
        targetIndex={targetIndex}
        spinDeg={spinDeg}
      />

      <Button
        size="lg"
        onClick={spin}
        disabled={spinning || places.length === 0}
        className="w-32 text-base"
      >
        {spinning ? '돌리는 중...' : '돌려!'}
      </Button>

      {places.length === 0 && (
        <p className="text-sm text-muted-foreground">
          식당 목록 탭에서 식당을 먼저 추가해주세요.
        </p>
      )}

      <PickRecordDialog
        place={selectedPlace}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
