'use client'

import { useJournal } from '@/hooks/use-journal'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function JournalList() {
  const { journals, isLoading } = useJournal()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  if (journals.length === 0) return <p className="text-sm text-muted-foreground">저장된 업무일지가 없습니다.</p>

  return (
    <ul className="space-y-1">
      {journals.map((journal) => (
        <li key={journal.id} className="rounded-lg border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
            onClick={() => setExpandedId(expandedId === journal.id ? null : journal.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {new Date(journal.date).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
              {journal.project && (
                <Badge variant="outline" className="text-xs">{journal.project}</Badge>
              )}
            </div>
            {expandedId === journal.id
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
          </button>
          {expandedId === journal.id && (
            <div className="border-t px-4 py-3">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                {journal.generated_content ?? journal.raw_input ?? '내용 없음'}
              </pre>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
