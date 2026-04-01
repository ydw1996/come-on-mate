'use client'

import { useRef, useEffect } from 'react'
import type { LunchPlaceWithLastPick } from '@/types'

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#EE5A24', '#009432', '#1289A7', '#C84B31', '#6F1E51',
]

interface Props {
  places: LunchPlaceWithLastPick[]
  spinning: boolean
  targetIndex: number | null
  spinDeg: number
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function stripHtmlTags(str: string) {
  return str.replace(/<[^>]*>/g, '')
}

function truncate(str: string, max: number) {
  const clean = stripHtmlTags(str)
  return clean.length > max ? clean.slice(0, max) + '…' : clean
}

export function SpinnerWheel({ places, spinning, spinDeg }: Props) {
  const wheelRef = useRef<SVGGElement>(null)
  const prevDeg = useRef(0)

  useEffect(() => {
    if (!wheelRef.current) return
    const el = wheelRef.current

    if (spinning) {
      el.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
      el.style.transform = `rotate(${spinDeg}deg)`
      prevDeg.current = spinDeg
    } else {
      el.style.transition = 'none'
      el.style.transform = `rotate(${prevDeg.current % 360}deg)`
    }
  }, [spinning, spinDeg])

  if (places.length === 0) {
    return (
      <div className="w-64 h-64 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center px-4">
          식당을 등록하면<br />돌림판이 나타나요
        </p>
      </div>
    )
  }

  const cx = 160
  const cy = 160
  const r = 140
  const sectorAngle = 360 / places.length

  return (
    <div className="relative">
      {/* 화살표 (12시 방향) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 text-2xl">
        ▼
      </div>

      <svg width="320" height="320" viewBox="0 0 320 320">
        <g ref={wheelRef} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {places.map((place, i) => {
            const startAngle = i * sectorAngle
            const endAngle = startAngle + sectorAngle
            const midAngle = startAngle + sectorAngle / 2
            const textPos = polarToCartesian(cx, cy, r * 0.65, midAngle)
            const color = COLORS[i % COLORS.length]

            return (
              <g key={place.id}>
                <path
                  d={sectorPath(cx, cy, r, startAngle, endAngle)}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={places.length > 8 ? '9' : '11'}
                  fontWeight="600"
                  fill="white"
                  transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(place.name, places.length > 8 ? 4 : 6)}
                </text>
              </g>
            )
          })}

          {/* 중앙 원 */}
          <circle cx={cx} cy={cy} r="20" fill="white" stroke="#e5e7eb" strokeWidth="2" />
        </g>
      </svg>
    </div>
  )
}
