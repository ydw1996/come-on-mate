'use client'

import { useState } from 'react'
import { useJournal } from '@/hooks/use-journal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Save } from 'lucide-react'

export function JournalGenerator() {
  const { templates, save, isSaving, generate, isGenerating } = useJournal()

  const [rawInput, setRawInput] = useState('')
  const [result, setResult] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('none')
  const [project, setProject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!rawInput.trim()) return
    setError('')
    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
      const content = await generate({
        rawInput,
        template: selectedTemplate?.template,
        project,
      })
      setResult(content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 생성에 실패했습니다.')
    }
  }

  async function handleSave() {
    await save({
      date,
      project: project || null,
      raw_input: rawInput,
      generated_content: result,
    })
    setRawInput('')
    setResult('')
    setProject('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">날짜</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">프로젝트</Label>
          <Input
            placeholder="프로젝트명"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">템플릿</Label>
          <Select value={selectedTemplateId ?? 'none'} onValueChange={setSelectedTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="템플릿 선택 (선택)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">기본 형식</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.project && `(${t.project})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">오늘 한 작업 (자유롭게 입력)</Label>
        <Textarea
          placeholder="예: 로그인 API 수정, 메인 배너 디자인 검토, 팀 미팅 참석..."
          rows={4}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!rawInput.trim() || isGenerating}
        className="w-full gap-2"
        variant="outline"
      >
        <Sparkles className="h-4 w-4" />
        {isGenerating ? 'AI 업무일지 생성 중...' : 'AI로 업무일지 생성'}
      </Button>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
      )}

      {result && (
        <div className="space-y-2">
          <Label className="text-xs">생성 결과 (수정 가능)</Label>
          <Textarea
            rows={12}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? '저장 중...' : '업무일지 저장'}
          </Button>
        </div>
      )}
    </div>
  )
}
