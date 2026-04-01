'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useLunchStats } from '@/hooks/use-lunch-stats'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`
}

function StatsContent({ period }: { period: 'week' | 'month' }) {
  const { data, isLoading } = useLunchStats(period)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const myPicks = data?.myPicks ?? []
  const top5 = data?.top5 ?? []
  const maxCnt = top5[0]?.cnt ?? 1

  return (
    <div className="space-y-6">
      {/* 내 기록 */}
      <div>
        <h3 className="text-sm font-semibold mb-3">내 점심 기록</h3>
        {myPicks.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록이 없어요.</p>
        ) : (
          <div className="space-y-2">
            {myPicks.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground w-20 shrink-0">
                  {formatDate(pick.date)}
                </span>
                <span className="font-medium flex-1">{pick.lunch_places?.name}</span>
                {pick.companions.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    +{pick.companions.length}명
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 팀 TOP5 */}
      {top5.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">팀 인기 식당 TOP 5</h3>
          <div className="space-y-3">
            {top5.map((item, i) => (
              <div key={item.place_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}</span>
                    <span className="font-medium">{item.name}</span>
                  </span>
                  <span className="text-muted-foreground">{item.cnt}회</span>
                </div>
                <Progress value={(item.cnt / maxCnt) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StatsPanel() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  return (
    <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
      <TabsList className="mb-4">
        <TabsTrigger value="week">이번 주</TabsTrigger>
        <TabsTrigger value="month">이번 달</TabsTrigger>
      </TabsList>
      <TabsContent value="week">
        <StatsContent period="week" />
      </TabsContent>
      <TabsContent value="month">
        <StatsContent period="month" />
      </TabsContent>
    </Tabs>
  )
}
