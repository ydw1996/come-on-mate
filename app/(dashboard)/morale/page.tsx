import { createClient } from '@/lib/supabase/server'
import { fetchMoraleSheet } from '@/lib/google-sheets'
import { MoraleSheet } from '@/components/morale/MoraleSheet'

export default async function MoralePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  // 서버에서 한 번만 fetch — 탭 전환은 클라이언트 필터링으로 처리
  const employees = await fetchMoraleSheet()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">사기진작비</h2>
      <MoraleSheet employees={employees} userName={profile?.name ?? ''} />
    </div>
  )
}
