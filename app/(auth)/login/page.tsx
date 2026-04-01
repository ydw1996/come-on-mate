export const dynamic = 'force-dynamic'

import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Come On Mate ☕</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          커머스온 내부 업무 자동화 서비스
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
