import { createClient } from '@/lib/supabase/server'
import { fetchMoraleSheet } from '@/lib/google-sheets'
import { MoraleSheet } from '@/components/morale/MoraleSheet'
import { ReceiptMailComposer } from '@/components/morale/ReceiptMailComposer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function MoralePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  const employees = await fetchMoraleSheet()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">사기진작비</h2>
      <Tabs defaultValue="sheet">
        <TabsList>
          <TabsTrigger value="sheet">내역 조회</TabsTrigger>
          <TabsTrigger value="receipt">영수증 메일</TabsTrigger>
        </TabsList>
        <TabsContent value="sheet" className="pt-4">
          <MoraleSheet employees={employees} userName={profile?.name ?? ''} />
        </TabsContent>
        <TabsContent value="receipt" className="pt-4">
          <ReceiptMailComposer employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
