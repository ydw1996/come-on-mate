'use client'

import { useState } from 'react'
import { Search, Plus, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLunchPlaces } from '@/hooks/use-lunch-places'
import type { NaverPlace, LunchPlaceWithLastPick } from '@/types'

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

interface Props {
  registeredPlaces: LunchPlaceWithLastPick[]
  onSearchResults?: (places: NaverPlace[]) => void
  onPlaceSelect?: (place: NaverPlace) => void
}

export function MapInlineSearch({ registeredPlaces, onSearchResults, onPlaceSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NaverPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const { searchNaverPlaces, addPlace, isAdding } = useLunchPlaces()

  const registeredNaverIds = new Set(
    registeredPlaces.map((p) => p.naver_place_id).filter(Boolean)
  )

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const data = await searchNaverPlaces(query)
      setResults(data)
      onSearchResults?.(data)
      if (data.length > 0) onPlaceSelect?.(data[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색 실패')
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd(e: React.MouseEvent, place: NaverPlace) {
    e.stopPropagation()
    const key = place.mapx + ',' + place.mapy
    try {
      await addPlace({
        name: stripHtml(place.title),
        category: place.category || null,
        naver_place_id: key,
        address: place.roadAddress || place.address || null,
      })
      setAddedIds((prev) => new Set(prev).add(key))
    } catch (e) {
      alert(e instanceof Error ? e.message : '추가 실패')
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setError(null)
    onSearchResults?.([])
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-10">
      {/* 검색 입력창 */}
      <div className="flex gap-1.5 bg-white rounded-lg shadow-md p-1.5">
        <Input
          placeholder="식당명 검색해서 추가 (지도 POI 직접 클릭 불가)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-8 text-sm border-0 shadow-none focus-visible:ring-0"
        />
        {(results.length > 0 || error) && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSearch}
          disabled={searching}
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 검색 결과 — 클릭 시 지도 핀+말풍선 */}
      {(results.length > 0 || error) && (
        <div className="mt-1 bg-white rounded-lg shadow-lg max-h-56 overflow-y-auto border">
          {error && <p className="text-xs text-destructive text-center py-3">{error}</p>}
          {results.map((place, i) => {
            const key = place.mapx + ',' + place.mapy
            const isRegistered = registeredNaverIds.has(key)
            const isJustAdded = addedIds.has(key)

            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => onPlaceSelect?.(place)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{stripHtml(place.title)}</p>
                  {place.category && (
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      {place.category.split('>').pop()?.trim()}
                    </Badge>
                  )}
                  {(place.roadAddress || place.address) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {place.roadAddress || place.address}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={isRegistered || isJustAdded ? 'secondary' : 'default'}
                  disabled={isRegistered || isJustAdded || isAdding}
                  onClick={(e) => handleAdd(e, place)}
                  className="shrink-0 h-7 text-xs"
                >
                  {isRegistered || isJustAdded ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      추가됨
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      추가
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
