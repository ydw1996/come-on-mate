'use client'

import { useState } from 'react'
import { JournalGenerator } from '@/components/journal/JournalGenerator'
import { JournalList } from '@/components/journal/JournalList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function JournalPage() {
  return (
    <Tabs defaultValue="write">
      <TabsList>
        <TabsTrigger value="write">업무일지 작성</TabsTrigger>
        <TabsTrigger value="history">지난 일지</TabsTrigger>
      </TabsList>

      <TabsContent value="write" className="mt-4">
        <JournalGenerator />
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <JournalList />
      </TabsContent>
    </Tabs>
  )
}
