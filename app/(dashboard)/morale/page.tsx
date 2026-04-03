import { createClient } from '@/lib/supabase/server'
import { MoraleSheet } from '@/components/morale/MoraleSheet'

export default async function MoralePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">사기진작비</h2>
      <MoraleSheet userName={profile?.name ?? ''} />
    </div>
  )
}
