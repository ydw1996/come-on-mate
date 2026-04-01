'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Journal, JournalTemplate } from '@/types'

async function fetchJournals(): Promise<Journal[]> {
  const res = await fetch('/api/journal')
  if (!res.ok) throw new Error('조회 실패')
  return res.json()
}

async function saveJournal(data: Pick<Journal, 'date' | 'project' | 'raw_input' | 'generated_content'>): Promise<Journal> {
  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('저장 실패')
  return res.json()
}

async function fetchTemplates(): Promise<JournalTemplate[]> {
  const res = await fetch('/api/journal/templates')
  if (!res.ok) throw new Error('조회 실패')
  return res.json()
}

async function generateJournal(params: { rawInput: string; template?: string; project?: string }): Promise<string> {
  const res = await fetch('/api/journal/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '생성 실패')
  return data.content
}

export function useJournal() {
  const queryClient = useQueryClient()

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ['journals'],
    queryFn: fetchJournals,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['journal-templates'],
    queryFn: fetchTemplates,
  })

  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: saveJournal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journals'] }),
  })

  const { mutateAsync: generate, isPending: isGenerating } = useMutation({
    mutationFn: generateJournal,
  })

  return { journals, templates, isLoading, save, isSaving, generate, isGenerating }
}
