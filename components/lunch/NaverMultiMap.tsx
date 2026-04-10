'use client'

import { useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface MarkerData {
  id: string
  lat: number
  lng: number
  name: string
}

export interface TempMarker {
  id: string
  lat: number
  lng: number
  name: string
  category?: string
  address?: string
  naverLink?: string
  markerContent?: string
}

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
        Event: { addListener(target: object, eventName: string, handler: () => void): void }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRegisteredIcon(nm: any, name: string, selected: boolean) {
  const label = name.length > 9 ? name.slice(0, 8) + '…' : name
  if (selected) {
    return {
      content: [
        `<div style="width:160px;text-align:center;cursor:pointer;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))">`,
        `<div style="width:52px;height:52px;background:#fef9c3;border:3px solid #eab308;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto;box-shadow:0 0 0 3px rgba(234,179,8,.25)">⭐</div>`,
        `<div style="background:#eab308;color:white;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;margin-top:4px;white-space:nowrap;display:inline-block;line-height:1.4;box-shadow:0 2px 6px rgba(0,0,0,.2)">${name}</div>`,
        `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #eab308;margin:0 auto"></div>`,
        `</div>`,
      ].join(''),
      anchor: new nm.Point(80, 91),
    }
  }
  return {
    content: [
      `<div style="width:80px;text-align:center;cursor:pointer">`,
      `<div style="width:36px;height:36px;background:#fef9c3;border:2.5px solid #eab308;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.28);margin:0 auto">⭐</div>`,
      `<div style="background:white;border:1px solid #e5e7eb;border-radius:4px;padding:2px 4px;font-size:10px;font-weight:700;margin-top:3px;box-shadow:0 1px 3px rgba(0,0,0,.15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#111;max-width:80px">${label}</div>`,
      `</div>`,
    ].join(''),
    anchor: new nm.Point(40, 18),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeTempIcon(nm: any, m: TempMarker, selected: boolean) {
  if (m.markerContent) {
    if (selected) {
      const emoji = m.markerContent.match(/font-size:18px[^>]*>([^<]+)<\/div>/)?.[1] ?? '🍽️'
      return {
        content: [
          `<div style="width:160px;text-align:center;cursor:pointer;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))">`,
          `<div style="width:52px;height:52px;background:white;border:3px solid #f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto;box-shadow:0 0 0 3px rgba(249,115,22,.25)">`,
          emoji,
          `</div>`,
          `<div style="background:#f97316;color:white;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;margin-top:4px;white-space:nowrap;display:inline-block;line-height:1.4;box-shadow:0 2px 6px rgba(0,0,0,.2)">${m.name}</div>`,
          `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #f97316;margin:0 auto"></div>`,
          `</div>`,
        ].join(''),
        anchor: new nm.Point(80, 91),
      }
    }
    return { content: m.markerContent, anchor: new nm.Point(40, 18) }
  }
  if (selected) {
    return {
      content: '<div style="width:20px;height:20px;background:#f97316;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(249,115,22,.7)"></div>',
      anchor: new nm.Point(10, 10),
    }
  }
  return {
    content: '<div style="width:14px;height:14px;background:#f97316;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
    anchor: new nm.Point(7, 7),
  }
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
  const markerListRef = useRef<{ id: string; marker: NaverMarker; data: MarkerData }[]>([])
  const tempMarkerListRef = useRef<{ id: string; marker: NaverMarker; data: TempMarker }[]>([])
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
    const center = markers.length > 0
      ? new window.naver.maps.LatLng(markers[0].lat, markers[0].lng)
      : new window.naver.maps.LatLng(37.5665, 126.978)
    mapRef.current = new window.naver.maps.Map(containerRef.current, { center, zoom: 15 })
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

  // 등록된 식당 마커 동기화
  useEffect(() => {
    if (!ready || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nm = window.naver.maps as any
    markerListRef.current.forEach(({ marker }) => marker.setMap(null))
    markerListRef.current = []
    infoWindowRef.current?.close()
    markers.forEach((m) => {
      const pos = new nm.LatLng(m.lat, m.lng)
      const icon = makeRegisteredIcon(nm, m.name, false)
      const marker = new nm.Marker({ position: pos, map: mapRef.current!, icon, zIndex: 1 })
      nm.Event.addListener(marker, 'click', () => onMarkerClickRef.current?.(m.id))
      markerListRef.current.push({ id: m.id, marker, data: m })
    })
  }, [ready, markers])

  // 임시 마커 동기화
  useEffect(() => {
    if (!ready || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nm = window.naver.maps as any
    tempMarkerListRef.current.forEach(({ marker }) => marker.setMap(null))
    tempMarkerListRef.current = []
    tempMarkers.forEach((m) => {
      const pos = new nm.LatLng(m.lat, m.lng)
      const icon = makeTempIcon(nm, m, false)
      const marker = new nm.Marker({ position: pos, map: mapRef.current!, icon, zIndex: 1 })
      nm.Event.addListener(marker, 'click', () => onTempMarkerClickRef.current?.(m))
      tempMarkerListRef.current.push({ id: m.id, marker, data: m })
    })
  }, [ready, tempMarkers])

  // 등록 식당 선택 → 마커 교체(강조) + 이동
  useEffect(() => {
    if (!ready || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nm = window.naver.maps as any
    infoWindowRef.current?.close()
    markerListRef.current.forEach((entry) => {
      const selected = entry.id === selectedId
      entry.marker.setMap(null)
      const pos = new nm.LatLng(entry.data.lat, entry.data.lng)
      const icon = makeRegisteredIcon(nm, entry.data.name, selected)
      const newMarker = new nm.Marker({ position: pos, map: mapRef.current!, icon, zIndex: selected ? 1000 : 1 })
      nm.Event.addListener(newMarker, 'click', () => onMarkerClickRef.current?.(entry.data.id))
      entry.marker = newMarker
    })
    if (!selectedId) return
    const found = markers.find((m) => m.id === selectedId)
    if (found) mapRef.current.panTo(new nm.LatLng(found.lat, found.lng))
  }, [selectedId, ready, markers])

  // 임시 마커 선택 → 마커 교체(강조) + 이동
  useEffect(() => {
    if (!ready || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nm = window.naver.maps as any
    tempMarkerListRef.current.forEach((entry) => {
      const selected = entry.id === selectedTempId
      entry.marker.setMap(null)
      const pos = new nm.LatLng(entry.data.lat, entry.data.lng)
      const icon = makeTempIcon(nm, entry.data, selected)
      const newMarker = new nm.Marker({ position: pos, map: mapRef.current!, icon, zIndex: selected ? 1000 : 1 })
      nm.Event.addListener(newMarker, 'click', () => onTempMarkerClickRef.current?.(entry.data))
      entry.marker = newMarker
    })
    if (!selectedTempId) return
    const found = tempMarkers.find((m) => m.id === selectedTempId)
    if (found) mapRef.current.panTo(new nm.LatLng(found.lat, found.lng))
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
