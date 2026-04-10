'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NaverMultiMapHandle, TempMarker } from './NaverMultiMap'
import type { NaverPlace } from '@/types'

interface CategoryStyle {
  label: string
  queries: string[]
  emoji: string
  color: string
  bg: string
}

const CATEGORIES: CategoryStyle[] = [
  { label: '음식점', queries: ['맛집', '뷔페', '분식', '국수', '쌀국수', '도시락', '포케', '샐러드'],       emoji: '🍽️', color: '#f97316', bg: '#fff7ed' },
  { label: '카페',   queries: ['카페', '커피', '디저트', '베이커리', '브런치카페', '스무디', '버블티', '아이스크림'], emoji: '☕',  color: '#92400e', bg: '#fef3c7' },
  { label: '한식',   queries: ['한정식', '삼겹살', '국밥', '순대국', '곱창', '냉면', '갈비', '불고기'],     emoji: '🍚',  color: '#dc2626', bg: '#fef2f2' },
  { label: '일식',   queries: ['초밥', '라멘', '우동', '돈카츠', '이자카야', '오마카세', '규동', '텐동'],   emoji: '🍣',  color: '#2563eb', bg: '#eff6ff' },
  { label: '양식',   queries: ['파스타', '스테이크', '피자', '버거', '브런치', '샌드위치', '비스트로', '그릴'], emoji: '🍝',  color: '#16a34a', bg: '#f0fdf4' },
  { label: '중식',   queries: ['중국집', '짜장면', '마라탕', '딤섬', '양꼬치', '마라샹궈', '짬뽕', '탕수육'], emoji: '🥢',  color: '#9333ea', bg: '#faf5ff' },
]

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

function makeMarkerContent(style: CategoryStyle, name: string): string {
  const label = escapeHtml(name.length > 9 ? name.slice(0, 8) + '…' : name)
  return [
    `<div style="width:80px;text-align:center;cursor:pointer">`,
    `<div style="width:36px;height:36px;background:${style.bg};border:2.5px solid ${style.color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.28);margin:0 auto">${style.emoji}</div>`,
    `<div style="background:white;border:1px solid #e5e7eb;border-radius:4px;padding:2px 4px;font-size:10px;font-weight:700;margin-top:3px;box-shadow:0 1px 3px rgba(0,0,0,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#111;max-width:80px">${label}</div>`,
    `</div>`,
  ].join('')
}

export function naverPlaceToTempMarker(place: NaverPlace, style?: CategoryStyle): TempMarker {
  const name = stripHtml(place.title)
  const lat = parseInt(place.mapy) / 1e7
  const lng = parseInt(place.mapx) / 1e7
  return {
    id: place.mapx + ',' + place.mapy,
    lat,
    lng,
    name,
    category: place.category || undefined,
    address: place.roadAddress || place.address || undefined,
    naverLink: `https://map.naver.com/p/search/${encodeURIComponent(name)}?c=${lng},${lat},15,0,0,0,dh`,
    markerContent: style ? makeMarkerContent(style, name) : undefined,
  }
}

interface Props {
  mapRef: React.RefObject<NaverMultiMapHandle | null>
  onResults: (markers: TempMarker[]) => void
}

export function MapCategoryButtons({ mapRef, onResults }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick(style: CategoryStyle) {
    if (active === style.label) {
      setActive(null)
      onResults([])
      return
    }
    setActive(style.label)
    setLoading(true)
    try {
      const center = mapRef.current?.getCenter()
      const params = new URLSearchParams({ mode: 'category', queries: style.queries.join(',') })
      if (center) {
        params.set('lat', center.lat.toString())
        params.set('lng', center.lng.toString())
      }
      const res = await fetch(`/api/lunch/places?${params}`)
      const data = await res.json()
      const markers = (data.results as NaverPlace[] ?? [])
        .map((p) => naverPlaceToTempMarker(p, style))
        .filter((m) => m.lat && m.lng && !isNaN(m.lat) && !isNaN(m.lng))
      onResults(markers)
    } catch {
      onResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.label
          const isLoading = loading && isActive
          return (
            <Button
              key={cat.label}
              size="sm"
              variant={isActive ? 'default' : 'secondary'}
              className="shrink-0 h-8 text-xs gap-1.5 shadow-sm font-medium"
              style={isActive ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' } : {}}
              onClick={() => handleClick(cat)}
              disabled={loading && !isActive}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="text-sm leading-none">{cat.emoji}</span>
              )}
              {cat.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
