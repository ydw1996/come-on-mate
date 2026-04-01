'use client'

import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLunchPlaces } from '@/hooks/use-lunch-places'
import type { LunchPlaceWithLastPick } from '@/types'

interface Props {
  place: LunchPlaceWithLastPick
  currentUserId: string
}

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

function formatLastPicked(dateStr: string | null) {
  if (!dateStr) return '아직 방문 기록 없음'
  const date = new Date(dateStr)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘 방문'
  if (diffDays === 1) return '어제 방문'
  return `${diffDays}일 전 방문`
}

export function PlaceCard({ place, currentUserId }: Props) {
  const { removePlace } = useLunchPlaces()

  return (
    <Card className="group relative">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{stripHtml(place.name)}</p>
            {place.category && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {place.category.split('>').pop()?.trim()}
              </Badge>
            )}
            {place.address && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{place.address}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {formatLastPicked(place.last_picked_at)}
            </p>
          </div>

          {place.added_by === currentUserId && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => removePlace(place.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
