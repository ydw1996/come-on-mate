'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpinButton } from '@/components/lunch/SpinButton'
import { PlaceList } from '@/components/lunch/PlaceList'
import { StatsPanel } from '@/components/lunch/StatsPanel'
import { useLunchPick } from '@/hooks/use-lunch-pick'

function TodayPickBanner() {
  const { todayPick } = useLunchPick()
  if (!todayPick) return null

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <span className="text-xl">🍽️</span>
        <div>
          <p className="text-sm text-muted-foreground">오늘의 점심</p>
          <p className="font-semibold">
            {todayPick.lunch_places?.name}
            {todayPick.companions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs font-normal">
                동행 {todayPick.companions.length}명
              </Badge>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LunchPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">오늘의 점심</h2>

      <TodayPickBanner />

      <Tabs defaultValue="roulette">
        <TabsList>
          <TabsTrigger value="roulette">돌림판</TabsTrigger>
          <TabsTrigger value="places">식당 목록</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        <TabsContent value="roulette" className="pt-6 flex justify-center">
          <SpinButton />
        </TabsContent>

        <TabsContent value="places" className="pt-4">
          <PlaceList />
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <StatsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
