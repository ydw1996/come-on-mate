'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [오류, set오류] = useState('')
  const [로딩중, set로딩중] = useState(false)

  async function 로그인(e: React.FormEvent) {
    e.preventDefault()
    set로딩중(true)
    set오류('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      set오류('이메일 또는 비밀번호를 확인해주세요.')
      set로딩중(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={로그인} className="space-y-4 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {오류 && (
        <p className="text-sm text-destructive">{오류}</p>
      )}

      <Button type="submit" className="w-full" disabled={로딩중}>
        {로딩중 ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  )
}
