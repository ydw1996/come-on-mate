import { createClient } from '@/lib/supabase/server'
import { CheckinButton } from '@/components/checkin/CheckinButton'
import { CheckinHistory } from '@/components/checkin/CheckinHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const 오늘 = new Date().toISOString().split('T')[0]

  const { count: 오늘할일수 } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('due_date', 오늘)
    .eq('is_done', false)

  const { count: 이번주할일수 } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('is_done', false)

  return (
    <div className="space-y-6">
      {/* 출퇴근 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">출퇴근</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckinButton />
          <CheckinHistory />
        </CardContent>
      </Card>

      {/* 할일 현황 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">오늘 남은 할일</p>
            <p className="mt-1 text-3xl font-bold">{오늘할일수 ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">전체 미완료</p>
            <p className="mt-1 text-3xl font-bold">{이번주할일수 ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 이동 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">바로가기</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { href: '/todos', label: '할일 관리' },
            { href: '/journal', label: '업무일지 작성' },
            { href: '/morale', label: '사기진작비 처리' },
            { href: '/lunch', label: '오늘 점심 뽑기' },
            { href: '/slack', label: '슬랙 채널 요약' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center justify-center rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              {item.label}
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
