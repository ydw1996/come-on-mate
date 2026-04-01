'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlaceCard } from './PlaceCard'
import { PlaceSearchDialog } from './PlaceSearchDialog'
import { useLunchPlaces } from '@/hooks/use-lunch-places'

export function PlaceList() {
  const { places, isLoading } = useLunchPlaces()
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {places.length}개 식당 등록됨
        </p>
        <PlaceSearchDialog registeredPlaces={places} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && places.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium">아직 등록된 식당이 없어요</p>
          <p className="text-sm mt-1">위 버튼으로 자주 가는 식당을 추가해보세요.</p>
        </div>
      )}

      {!isLoading && places.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
