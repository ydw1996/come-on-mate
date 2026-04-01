'use client'

import { useTodos } from '@/hooks/use-todos'
import { TodoForm } from '@/components/todos/TodoForm'
import { TodoList } from '@/components/todos/TodoList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TodosPage() {
  const { todayTodos, weekTodos, otherTodos, isLoading } = useTodos()

  return (
    <div className="space-y-4">
      <TodoForm />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">
              오늘 <span className="ml-1.5 text-xs opacity-70">{todayTodos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="week">
              이번주 <span className="ml-1.5 text-xs opacity-70">{weekTodos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="all">
              전체 <span className="ml-1.5 text-xs opacity-70">{otherTodos.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-3">
            <TodoList items={todayTodos} emptyMessage="오늘 등록된 할일이 없습니다." />
          </TabsContent>
          <TabsContent value="week" className="mt-3">
            <TodoList items={weekTodos} emptyMessage="이번주 할일이 없습니다." />
          </TabsContent>
          <TabsContent value="all" className="mt-3">
            <TodoList items={otherTodos} emptyMessage="할일이 없습니다." />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
