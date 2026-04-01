'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTodos } from '@/hooks/use-todos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  description: z.string().optional(),
  project: z.string().optional(),
  due_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function TodoForm() {
  const { add, isAdding } = useTodos()
  const [isExpanded, setIsExpanded] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormValues) {
    add({
      title: data.title,
      description: data.description ?? null,
      project: data.project ?? null,
      due_date: data.due_date ?? null,
    })
    reset()
    setIsExpanded(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input placeholder="할일을 입력하세요..." {...register('title')} />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button type="submit" size="icon" disabled={isAdding}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">프로젝트</Label>
              <Input placeholder="프로젝트명" {...register('project')} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">마감일</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">메모</Label>
            <Textarea placeholder="메모 (선택)" rows={2} {...register('description')} />
          </div>
        </div>
      )}
    </form>
  )
}
