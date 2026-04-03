import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMoraleSheet } from '@/lib/google-sheets'

// GET /api/morale/sheet?name={이름}
// name 파라미터 없으면 전체 반환
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filterName = searchParams.get('name')

  try {
    const employees = await fetchMoraleSheet()
    const filtered = filterName
      ? employees.filter((e) => e.이름 === filterName)
      : employees

    return NextResponse.json({ employees: filtered })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
