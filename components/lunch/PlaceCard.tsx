'use client'

import { Trash2, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLunchPlaces } from '@/hooks/use-lunch-places'
import type { LunchPlaceWithLastPick } from '@/types'

interface Props {
  place: LunchPlaceWithLastPick
  currentUserId: string
  selected?: boolean
  onClick?: () => void
}

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

function naverMapsUrl(name: string, naverPlaceId: string | null): string {
  if (naverPlaceId) {
    const [mapx, mapy] = naverPlaceId.split(',')
    if (mapx && mapy) {
      const lng = parseInt(mapx) / 1e7
      const lat = parseInt(mapy) / 1e7
      return `https://map.naver.com/p/search/${encodeURIComponent(name)}?c=${lng},${lat},15,0,0,0,dh`
    }
  }
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}`
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

export function PlaceCard({ place, currentUserId, selected, onClick }: Props) {
  const { removePlace } = useLunchPlaces()

  return (
    <Card
      className={`group relative cursor-pointer transition-colors ${selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/30'}`}
      onClick={onClick}
    >
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

          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={naverMapsUrl(place.name, place.naver_place_id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                <MapPin className="h-3.5 w-3.5" />
              </Button>
            </a>
            {place.added_by === currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removePlace(place.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
