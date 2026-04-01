'use client'

import { useTodos } from '@/hooks/use-todos'
import type { Todo } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodoListProps {
  items: Todo[]
  emptyMessage?: string
}

export function TodoList({ items, emptyMessage = '할일이 없습니다.' }: TodoListProps) {
  const { toggle, remove } = useTodos()

  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-1">
      {items.map((todo) => (
        <li key={todo.id} className="group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/50">
          <Checkbox
            checked={todo.is_done}
            onCheckedChange={() => toggle(todo.id)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium leading-snug', todo.is_done && 'line-through text-muted-foreground')}>
              {todo.title}
            </p>
            {todo.description && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{todo.description}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {todo.project && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">{todo.project}</Badge>
              )}
              {todo.due_date && (
                <span className="text-xs text-muted-foreground">
                  {new Date(todo.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={() => remove(todo.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
