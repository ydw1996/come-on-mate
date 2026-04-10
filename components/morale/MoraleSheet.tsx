'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MoraleEmployee } from '@/lib/google-sheets'

interface Props {
  employees: MoraleEmployee[]
  userName: string
}

function getCurrentMonth() {
  return `${new Date().getMonth() + 1}월`
}

export function MoraleSheet({ employees, userName }: Props) {
  const [tab, setTab] = useState<'mine' | 'all'>('mine')

  const thisMonth = getCurrentMonth()
  const myData = employees.find((e) => e.이름 === userName)
  const myThisMonth = myData?.월별.find((m) => m.월 === thisMonth)

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === 'mine' ? 'default' : 'outline'}
          onClick={() => setTab('mine')}
        >
          내 사기진작비
        </Button>
        <Button
          size="sm"
          variant={tab === 'all' ? 'default' : 'outline'}
          onClick={() => setTab('all')}
        >
          전체 조회
        </Button>
      </div>

      {tab === 'mine' ? (
        <MyView data={myData} thisMonth={thisMonth} thisMonthData={myThisMonth} />
      ) : (
        <AllView employees={employees} thisMonth={thisMonth} />
      )}
    </div>
  )
}

/* ── 내 사기진작비 ── */
function MyView({
  data,
  thisMonth,
  thisMonthData,
}: {
  data: MoraleEmployee | undefined
  thisMonth: string
  thisMonthData: { 월: string; 사용금액: number; 잔여금액: number } | undefined
}) {
  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        데이터를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">{thisMonth} 사용금액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(thisMonthData?.사용금액 ?? 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">{thisMonth} 잔여금액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {(thisMonthData?.잔여금액 ?? 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">누적 사용 합계</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.합계.toLocaleString()}원</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">월별 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">월</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">사용금액</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">잔여금액</th>
              </tr>
            </thead>
            <tbody>
              {data.월별.map((m) => (
                <tr
                  key={m.월}
                  className={`border-b last:border-0 ${m.월 === thisMonth ? 'bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}
                >
                  <td className="px-4 py-3">
                    {m.월}
                    {m.월 === thisMonth && (
                      <Badge variant="secondary" className="ml-2 text-xs">이번달</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.사용금액 > 0 ? `${m.사용금액.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {m.잔여금액 > 0 ? `${m.잔여금액.toLocaleString()}원` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ── 전체 조회 ── */
function AllView({
  employees,
  thisMonth,
}: {
  employees: MoraleEmployee[]
  thisMonth: string
}) {
  if (employees.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">데이터가 없습니다.</div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">NO</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">직원명</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{thisMonth} 사용</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{thisMonth} 잔여</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">합계</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const monthData = emp.월별.find((m) => m.월 === thisMonth)
                return (
                  <tr key={emp.no} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{emp.no}</td>
                    <td className="px-4 py-3 font-medium">{emp.이름}</td>
                    <td className="px-4 py-3 text-right">
                      {monthData?.사용금액 ? `${monthData.사용금액.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {monthData?.잔여금액 ? `${monthData.잔여금액.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {emp.합계.toLocaleString()}원
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
