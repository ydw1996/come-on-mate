'use client'

import { useState } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NaverMap } from './NaverMap'
import { useLunchPlaces } from '@/hooks/use-lunch-places'
import type { NaverPlace, LunchPlaceWithLastPick } from '@/types'

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

function toLatLng(mapx: string, mapy: string) {
  return {
    lng: parseInt(mapx) / 1e7,
    lat: parseInt(mapy) / 1e7,
  }
}

interface Props {
  registeredPlaces: LunchPlaceWithLastPick[]
}

export function PlaceSearchDialog({ registeredPlaces }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NaverPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<NaverPlace | null>(null)

  const { searchNaverPlaces, addPlace, isAdding } = useLunchPlaces()

  const registeredNaverIds = new Set(
    registeredPlaces.map((p) => p.naver_place_id).filter(Boolean)
  )

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setSelectedPlace(null)
    try {
      const data = await searchNaverPlaces(query)
      setResults(data)
      if (data.length > 0) setSelectedPlace(data[0])
    } catch (e) {
      const msg = e instanceof Error ? e.message : '검색 실패'
      setSearchError(msg)
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd(place: NaverPlace) {
    try {
      await addPlace({
        name: stripHtml(place.title),
        category: place.category || null,
        naver_place_id: place.mapx + ',' + place.mapy,
        address: place.roadAddress || place.address || null,
      })
      setAddedIds((prev) => new Set(prev).add(place.mapx + ',' + place.mapy))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '추가 실패'
      alert(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedPlace(null); setResults([]) } }}>
      <DialogTrigger>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          식당 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>식당 검색</DialogTitle>
        </DialogHeader>

        {/* 검색창 */}
        <div className="flex gap-2 shrink-0">
          <Input
            placeholder="식당명 검색 (예: 강남 삼겹살)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* 에러 */}
        {searchError && (
          <p className="text-sm text-destructive text-center shrink-0">{searchError}</p>
        )}

        {/* 지도 (선택된 식당) */}
        {selectedPlace && (
          <div className="shrink-0">
            <NaverMap
              lat={toLatLng(selectedPlace.mapx, selectedPlace.mapy).lat}
              lng={toLatLng(selectedPlace.mapx, selectedPlace.mapy).lng}
              placeName={stripHtml(selectedPlace.title)}
              className="w-full h-52 rounded-lg overflow-hidden"
            />
          </div>
        )}

        {/* 검색 결과 목록 */}
        <div className="overflow-y-auto flex-1 space-y-1.5 min-h-0">
          {searching && (
            <p className="text-sm text-muted-foreground text-center py-4">검색 중...</p>
          )}
          {!searching && !searchError && results.length === 0 && query && (
            <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없어요.</p>
          )}
          {results.map((place, i) => {
            const naverKey = place.mapx + ',' + place.mapy
            const isRegistered = registeredNaverIds.has(naverKey)
            const isJustAdded = addedIds.has(naverKey)
            const isSelected = selectedPlace?.mapx === place.mapx

            return (
              <div
                key={i}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary/40' : 'bg-card hover:bg-muted/50'
                }`}
                onClick={() => setSelectedPlace(place)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{stripHtml(place.title)}</p>
                  {place.category && (
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      {place.category.split('>').pop()?.trim()}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {place.roadAddress || place.address}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isRegistered || isJustAdded ? 'secondary' : 'default'}
                  disabled={isRegistered || isJustAdded || isAdding}
                  onClick={(e) => { e.stopPropagation(); handleAdd(place) }}
                  className="shrink-0"
                >
                  {isRegistered || isJustAdded ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      추가됨
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      추가
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
