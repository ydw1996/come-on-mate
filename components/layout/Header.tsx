'use client'

import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const pageTitles: Record<string, string> = {
  '/': '대시보드',
  '/todos': '할일 관리',
  '/journal': '업무일지',
  '/lunch': '오늘의 점심',
  '/slack': '슬랙 요약',
  '/morale': '사기진작비',
}

interface HeaderProps {
  userName?: string
}

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? ''

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const initial = userName ? userName[0].toUpperCase() : '?'

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{today}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
