'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lng: number
  placeName: string
  className?: string
}

function waitForNaver(): Promise<void> {
  return new Promise((resolve) => {
    if (window.naver?.maps) { resolve(); return }
    const interval = setInterval(() => {
      if (window.naver?.maps) { clearInterval(interval); resolve() }
    }, 100)
  })
}

export function NaverMap({ lat, lng, placeName, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    waitForNaver().then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !containerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nm = window.naver.maps as any

    mapRef.current?.destroy()

    const position = new nm.LatLng(lat, lng)
    const map = new nm.Map(containerRef.current, { center: position, zoom: 16 })
    mapRef.current = map

    const marker = new nm.Marker({ position, map })
    const infoWindow = new nm.InfoWindow({
      content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${placeName}</div>`,
    })
    infoWindow.open(map, marker)

    return () => { mapRef.current?.destroy() }
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
