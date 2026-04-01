'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '@/types'

async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos')
  if (!res.ok) throw new Error('조회 실패')
  return res.json()
}

async function addTodo(data: Pick<Todo, 'title' | 'description' | 'project' | 'due_date'>): Promise<Todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('추가 실패')
  return res.json()
}

async function toggleTodo(id: string): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}/toggle`, { method: 'PATCH' })
  if (!res.ok) throw new Error('수정 실패')
  return res.json()
}

async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('삭제 실패')
}

export function useTodos() {
  const queryClient = useQueryClient()

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  const today = new Date().toISOString().split('T')[0]

  const endOfWeek = new Date()
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

  const todayTodos = todos.filter((t) => t.due_date === today)
  const weekTodos = todos.filter((t) => t.due_date && t.due_date > today && t.due_date <= endOfWeekStr)
  const otherTodos = todos.filter((t) => !t.due_date || t.due_date < today || t.due_date > endOfWeekStr)

  const { mutate: add, isPending: isAdding } = useMutation({
    mutationFn: addTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: toggleTodo,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, is_done: !t.is_done } : t))
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['todos'], ctx.previous)
    },
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  return { todos, todayTodos, weekTodos, otherTodos, isLoading, add, isAdding, toggle, remove }
}
