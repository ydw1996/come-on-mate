'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lng: number
  placeName: string
  className?: string
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMapInstance
        Marker: new (opts: object) => object
        LatLng: new (lat: number, lng: number) => object
        InfoWindow: new (opts: object) => NaverInfoWindow
      }
    }
  }
}

interface NaverMapInstance {
  destroy(): void
}

interface NaverInfoWindow {
  open(map: NaverMapInstance, marker: object): void
}

function waitForNaver(): Promise<void> {
  return new Promise((resolve) => {
    if (window.naver?.maps) {
      resolve()
      return
    }
    const interval = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
}

export function NaverMap({ lat, lng, placeName, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<NaverMapInstance | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    waitForNaver().then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !containerRef.current) return

    mapRef.current?.destroy()

    const position = new window.naver.maps.LatLng(lat, lng)

    const map = new window.naver.maps.Map(containerRef.current, {
      center: position,
      zoom: 16,
    })
    mapRef.current = map

    const marker = new window.naver.maps.Marker({ position, map })

    const infoWindow = new window.naver.maps.InfoWindow({
      content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${placeName}</div>`,
    })
    infoWindow.open(map, marker)

    return () => {
      mapRef.current?.destroy()
    }
  }, [ready, lat, lng, placeName])

  return (
    <div className={className ?? 'w-full h-48 rounded-lg overflow-hidden relative'}>
      {!ready && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <p className="text-xs text-muted-foreground">지도 로딩 중...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
