'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Plus, X, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceCard } from './PlaceCard';
import {
  NaverMultiMap,
  naverMapsUrl,
  type MarkerData,
  type TempMarker,
  type NaverMultiMapHandle,
} from './NaverMultiMap';
import { MapInlineSearch } from './MapInlineSearch';
import { MapCategoryButtons, naverPlaceToTempMarker } from './MapCategoryButtons';
import { useLunchPlaces } from '@/hooks/use-lunch-places';
import type { NaverPlace } from '@/types';

function parseCoords(naverPlaceId: string | null) {
  if (!naverPlaceId) return null;
  const [mapx, mapy] = naverPlaceId.split(',');
  if (!mapx || !mapy) return null;
  return { lng: parseInt(mapx) / 1e7, lat: parseInt(mapy) / 1e7 };
}

function getMainCategory(category: string | null) {
  if (!category) return null;
  const parts = category.split('>');
  return parts.length > 1 ? parts[1].trim() : parts[0].trim();
}

interface RecommendResult {
  name: string;
  reason: string;
}

export function PlaceList() {
  const { places, isLoading, addPlace } = useLunchPlaces();
  const mapRef = useRef<NaverMultiMapHandle>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recommend'>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [allCategoryMarkers, setAllCategoryMarkers] = useState<TempMarker[]>([]);
  const [categoryIndex, setCategoryIndex] = useState<number | null>(null);
  const [tempMarkers, setTempMarkers] = useState<TempMarker[]>([]);
  const [selectedTempPlace, setSelectedTempPlace] = useState<TempMarker | null>(null);
  const [panelThumbnail, setPanelThumbnail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // 선택된 장소 썸네일 이미지 fetch
  useEffect(() => {
    const name =
      selectedTempPlace?.name ??
      (selectedId ? places.find((p) => p.id === selectedId)?.name : null);

    if (!name) {
      setPanelThumbnail(null);
      return;
    }

    setPanelThumbnail(null);
    const controller = new AbortController();
    fetch(`/api/lunch/place-image?q=${encodeURIComponent(name)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.thumbnail) setPanelThumbnail(data.thumbnail);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [selectedTempPlace, selectedId, places]);

  const categories = Array.from(
    new Set(places.map((p) => getMainCategory(p.category)).filter(Boolean) as string[])
  );

  const filteredPlaces =
    activeTab === 'all' && activeCategory
      ? places.filter((p) => getMainCategory(p.category) === activeCategory)
      : places;

  const markers: MarkerData[] = filteredPlaces
    .map((p) => {
      const coords = parseCoords(p.naver_place_id);
      if (!coords) return null;
      return { id: p.id, lat: coords.lat, lng: coords.lng, name: p.name };
    })
    .filter((m): m is MarkerData => m !== null);

  function handleSearchResults(navPlaces: NaverPlace[]) {
    setTempMarkers(navPlaces.map((p) => naverPlaceToTempMarker(p)));
    setSelectedTempPlace(null);
  }

  function handlePlaceSelect(place: NaverPlace) {
    const tm = naverPlaceToTempMarker(place);
    setTempMarkers((prev) => {
      if (prev.find((m) => m.id === tm.id)) return prev;
      return [...prev, tm];
    });
    setSelectedTempPlace(tm);
  }

  function handleTempMarkerClick(marker: TempMarker) {
    setSelectedTempPlace(marker);
    setSelectedId(null);
    const idx = allCategoryMarkers.findIndex((m) => m.id === marker.id);
    if (idx !== -1) setCategoryIndex(idx);
  }

  function navigateCategory(delta: number) {
    if (categoryIndex === null || allCategoryMarkers.length === 0) return;
    const next = categoryIndex + delta;
    if (next < 0 || next >= allCategoryMarkers.length) return;
    setCategoryIndex(next);
    setSelectedTempPlace(allCategoryMarkers[next]);
    setSelectedId(null);
  }

  async function handleRecommend() {
    setRecommending(true);
    setRecommendation(null);
    try {
      const res = await fetch('/api/lunch/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: filteredPlaces }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecommendation(data);
      const found = places.find((p) => p.name === data.name);
      if (found) setSelectedId(found.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '추천 실패');
    } finally {
      setRecommending(false);
    }
  }

  async function handleAddTempPlace(tm: TempMarker) {
    try {
      await addPlace({
        name: tm.name,
        category: tm.category || null,
        naver_place_id: tm.id,
        address: tm.address || null,
      });
      setSelectedTempPlace(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '추가 실패');
    }
  }

  const isAlreadyRegistered = (tm: TempMarker) => places.some((p) => p.naver_place_id === tm.id);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* ── 왼쪽: 목록 ── */}
      <div className="w-full lg:w-95 shrink-0 flex flex-col gap-3">
        {/* 메인 탭 */}
        <div className="flex gap-1.5">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('all');
              setRecommendation(null);
            }}
          >
            전체{places.length > 0 ? ` (${places.length})` : ''}
          </Button>
          <Button
            variant={activeTab === 'recommend' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('recommend')}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            오늘의 추천
          </Button>
        </div>

        {/* 카테고리 필터 */}
        {activeTab === 'all' && categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={activeCategory === null ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => setActiveCategory(null)}
            >
              전체
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {/* 오늘의 추천 */}
        {activeTab === 'recommend' && (
          <div className="space-y-3">
            <Button
              onClick={handleRecommend}
              disabled={recommending || places.length === 0}
              className="w-full gap-2"
            >
              {recommending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI가 고르는 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  오늘 점심 추천받기
                </>
              )}
            </Button>
            {recommendation && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-3 px-4">
                  <p className="font-semibold">🍽️ {recommendation.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{recommendation.reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 식당 목록 */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filteredPlaces.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm">
              {activeCategory
                ? `${activeCategory} 카테고리 식당이 없어요`
                : '아직 등록된 식당이 없어요'}
            </p>
          </div>
        )}

        <div className="space-y-2 max-h-[50vh] lg:max-h-[520px] overflow-y-auto pr-0.5">
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              currentUserId={currentUserId}
              selected={selectedId === place.id}
              onClick={() => {
                setSelectedId((prev) => (prev === place.id ? null : place.id));
                setSelectedTempPlace(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* ── 오른쪽: 지도 ── */}
      <div className="relative flex-1 min-w-0 h-110 lg:h-150 rounded-xl border overflow-hidden bg-muted">
        <NaverMultiMap
          ref={mapRef}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={(id) => {
            setSelectedId(id);
            setSelectedTempPlace(null);
            setCategoryIndex(null);
          }}
          tempMarkers={tempMarkers}
          selectedTempId={selectedTempPlace?.id ?? null}
          onTempMarkerClick={handleTempMarkerClick}
          className="w-full h-full"
        />

        {/* 검색 오버레이 (상단) */}
        <MapInlineSearch
          registeredPlaces={places}
          onSearchResults={handleSearchResults}
          onPlaceSelect={handlePlaceSelect}
        />

        {/* 선택된 등록 식당 패널 */}
        {selectedId &&
          !selectedTempPlace &&
          (() => {
            const sp = places.find((p) => p.id === selectedId);
            if (!sp) return null;
            return (
              <div className="absolute bottom-14 left-3 right-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
                <div className="flex items-start gap-2">
                  {/* 썸네일 */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {panelThumbnail ? (
                      <Image
                        src={panelThumbnail}
                        alt={sp.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{sp.name}</p>
                    {sp.category && (
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {sp.category.split('>').pop()?.trim()}
                      </Badge>
                    )}
                    {sp.address && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{sp.address}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a
                      href={(() => {
                        if (sp.naver_place_id) {
                          const [mapx, mapy] = sp.naver_place_id.split(',');
                          if (mapx && mapy)
                            return naverMapsUrl(
                              sp.name,
                              parseInt(mapy) / 1e7,
                              parseInt(mapx) / 1e7
                            );
                        }
                        return naverMapsUrl(sp.name);
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <MapPin className="h-3 w-3" />
                        네이버 지도
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setSelectedId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* 선택된 검색 결과 패널 */}
        {selectedTempPlace && (
          <div className="absolute bottom-14 left-3 right-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
            {/* 카테고리 내비게이션 */}
            {allCategoryMarkers.length > 1 && categoryIndex !== null && (
              <div className="flex items-center justify-between mb-2">
                <Button
                  size="sm" variant="outline" className="h-6 text-xs px-2"
                  disabled={categoryIndex === 0}
                  onClick={() => navigateCategory(-1)}
                >← 이전</Button>
                <span className="text-xs text-muted-foreground">
                  {categoryIndex + 1} / {allCategoryMarkers.length}
                </span>
                <Button
                  size="sm" variant="outline" className="h-6 text-xs px-2"
                  disabled={categoryIndex === allCategoryMarkers.length - 1}
                  onClick={() => navigateCategory(1)}
                >다음 →</Button>
              </div>
            )}
            <div className="flex items-start gap-2">
              {/* 썸네일 */}
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {panelThumbnail ? (
                  <Image
                    src={panelThumbnail}
                    alt={selectedTempPlace.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🍽️</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedTempPlace.name}</p>
                {selectedTempPlace.category && (
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {selectedTempPlace.category.split('>').pop()?.trim()}
                  </Badge>
                )}
                {selectedTempPlace.address && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {selectedTempPlace.address}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <a
                  href={
                    selectedTempPlace.naverLink ??
                    `https://map.naver.com/p/search/${encodeURIComponent(selectedTempPlace.name)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <MapPin className="h-3 w-3" />
                    네이버 지도
                  </Button>
                </a>
                {!isAlreadyRegistered(selectedTempPlace) && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAddTempPlace(selectedTempPlace)}
                  >
                    <Plus className="h-3 w-3" />
                    추가
                  </Button>
                )}
                {isAlreadyRegistered(selectedTempPlace) && (
                  <Badge variant="secondary" className="self-center text-xs">
                    등록됨
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setSelectedTempPlace(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 카테고리 빠른검색 (하단) */}
        <MapCategoryButtons
          mapRef={mapRef}
          onResults={(markers) => {
            setAllCategoryMarkers(markers);
            setTempMarkers(markers);
            if (markers.length > 0) {
              setCategoryIndex(0);
              setSelectedTempPlace(markers[0]);
            } else {
              setCategoryIndex(null);
              setSelectedTempPlace(null);
            }
          }}
        />
      </div>
    </div>
  );
}
