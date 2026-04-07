'use client'

import { useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface MarkerData {
  id: string
  lat: number
  lng: number
  name: string
}

export interface TempMarker {
  id: string // mapx + ',' + mapy
  lat: number
  lng: number
  name: string
  category?: string
  address?: string
  naverLink?: string
  /** 카테고리 마커용 커스텀 HTML (80px 컨테이너 기준, anchor Point(40,18)) */
  markerContent?: string
}

/** 이름·좌표로 네이버 지도 검색 URL 생성 */
export function naverMapsUrl(name: string, lat?: number, lng?: number): string {
  const base = `https://map.naver.com/p/search/${encodeURIComponent(name)}`
  if (lat && lng) return `${base}?c=${lng},${lat},15,0,0,0,dh`
  return base
}

export interface NaverMultiMapHandle {
  getCenter(): { lat: number; lng: number } | null
}

interface NaverMapInstance {
  panTo(pos: object): void
  setCenter(pos: object): void
  getCenter(): { lat(): number; lng(): number }
  destroy(): void
}

interface NaverMarker {
  setMap(map: NaverMapInstance | null): void
}

interface NaverInfoWindow {
  setContent(html: string): void
  open(map: NaverMapInstance, marker: NaverMarker): void
  close(): void
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMapInstance
        Marker: new (opts: object) => NaverMarker
        LatLng: new (lat: number, lng: number) => object
        InfoWindow: new (opts: object) => NaverInfoWindow
        Event: {
          addListener(target: object, eventName: string, handler: () => void): void
        }
      }
    }
  }
}

function waitForNaver(): Promise<void> {
  return new Promise((resolve) => {
    if (window.naver?.maps) { resolve(); return }
    const interval = setInterval(() => {
      if (window.naver?.maps) { clearInterval(interval); resolve() }
    }, 100)
  })
}

interface Props {
  ref?: React.Ref<NaverMultiMapHandle>
  markers: MarkerData[]
  selectedId?: string | null
  onMarkerClick?: (id: string) => void
  tempMarkers?: TempMarker[]
  selectedTempId?: string | null
  onTempMarkerClick?: (marker: TempMarker) => void
  className?: string
}

export function NaverMultiMap({
  ref,
  markers,
  selectedId,
  onMarkerClick,
  tempMarkers = [],
  selectedTempId,
  onTempMarkerClick,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<NaverMapInstance | null>(null)
  const markerListRef = useRef<{ id: string; marker: NaverMarker }[]>([])
  const tempMarkerListRef = useRef<{ id: string; marker: NaverMarker }[]>([])
  const infoWindowRef = useRef<NaverInfoWindow | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onTempMarkerClickRef = useRef(onTempMarkerClick)
  const [ready, setReady] = useState(false)

  onMarkerClickRef.current = onMarkerClick
  onTempMarkerClickRef.current = onTempMarkerClick

  useImperativeHandle(ref, () => ({
    getCenter() {
      if (!mapRef.current) return null
      const c = mapRef.current.getCenter()
      return { lat: c.lat(), lng: c.lng() }
    },
  }))

  useEffect(() => {
    waitForNaver().then(() => setReady(true))
  }, [])

  // 지도 초기화
  useEffect(() => {
    if (!ready || !containerRef.current) return

    const center =
      markers.length > 0
        ? new window.naver.maps.LatLng(markers[0].lat, markers[0].lng)
        : new window.naver.maps.LatLng(37.5665, 126.978)

    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center,
      zoom: 15,
    })
    infoWindowRef.current = new window.naver.maps.InfoWindow({ content: '' })

    return () => {
      markerListRef.current.forEach(({ marker }) => marker.setMap(null))
      markerListRef.current = []
      tempMarkerListRef.current.forEach(({ marker }) => marker.setMap(null))
      tempMarkerListRef.current = []
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // 등록된 식당 마커 동기화 — 변경 시 말풍선 닫기
  useEffect(() => {
    if (!ready || !mapRef.current) return

    markerListRef.current.forEach(({ marker }) => marker.setMap(null))
    markerListRef.current = []
    infoWindowRef.current?.close()

    markers.forEach((m) => {
      const pos = new window.naver.maps.LatLng(m.lat, m.lng)
      const marker = new window.naver.maps.Marker({ position: pos, map: mapRef.current! })
      window.naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClickRef.current?.(m.id)
        infoWindowRef.current?.setContent(
          `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${m.name}</div>`
        )
        infoWindowRef.current?.open(mapRef.current!, marker)
      })
      markerListRef.current.push({ id: m.id, marker })
    })
  }, [ready, markers])

  // 임시 마커 동기화 (검색·카테고리 결과) — 주황 점
  useEffect(() => {
    if (!ready || !mapRef.current) return

    tempMarkerListRef.current.forEach(({ marker }) => marker.setMap(null))
    tempMarkerListRef.current = []

    tempMarkers.forEach((m) => {
      const pos = new window.naver.maps.LatLng(m.lat, m.lng)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nm = window.naver.maps as any
      const icon = m.markerContent
        ? { content: m.markerContent, anchor: new nm.Point(40, 18) }
        : {
            content:
              '<div style="width:14px;height:14px;background:#f97316;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
            anchor: new nm.Point(7, 7),
          }
      const marker = new window.naver.maps.Marker({
        position: pos,
        map: mapRef.current!,
        icon,
      } as object)
      window.naver.maps.Event.addListener(marker, 'click', () => {
        onTempMarkerClickRef.current?.(m)
        infoWindowRef.current?.setContent(
          `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${m.name}</div>`
        )
        infoWindowRef.current?.open(mapRef.current!, marker)
      })
      tempMarkerListRef.current.push({ id: m.id, marker })
    })
  }, [ready, tempMarkers])

  // 등록된 식당 선택 → 이동
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedId) return
    const found = markers.find((m) => m.id === selectedId)
    if (!found) return

    const pos = new window.naver.maps.LatLng(found.lat, found.lng)
    mapRef.current.panTo(pos)

    const markerObj = markerListRef.current.find((m) => m.id === selectedId)
    if (markerObj && infoWindowRef.current) {
      infoWindowRef.current.setContent(
        `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${found.name}</div>`
      )
      infoWindowRef.current.open(mapRef.current, markerObj.marker)
    }
  }, [selectedId, ready, markers])

  // 검색 결과 선택 → 이동
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedTempId) return
    const found = tempMarkers.find((m) => m.id === selectedTempId)
    if (!found) return

    const pos = new window.naver.maps.LatLng(found.lat, found.lng)
    mapRef.current.panTo(pos)

    const markerObj = tempMarkerListRef.current.find((m) => m.id === selectedTempId)
    if (markerObj && infoWindowRef.current) {
      infoWindowRef.current.setContent(
        `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${found.name}</div>`
      )
      infoWindowRef.current.open(mapRef.current, markerObj.marker)
    }
  }, [selectedTempId, ready, tempMarkers])

  return (
    <div className={`relative ${className ?? 'w-full h-full'}`}>
      {!ready && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <p className="text-xs text-muted-foreground">지도 로딩 중...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
