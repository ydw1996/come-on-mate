import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMailConfigErrorMessage } from '@/lib/mail/config'
import { listInboxPreviews } from '@/lib/mail/imap'

export const runtime = 'nodejs'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function GET() {
  const user = await requireUser()

  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const messages = await listInboxPreviews()
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[mail/inbox]', error)

    return NextResponse.json(
      {
        error: getMailConfigErrorMessage(error) ?? '메일함을 불러오지 못했습니다. IMAP 설정을 확인해 주세요.',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const user = await requireUser()

  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: '로그인 이메일을 확인할 수 없습니다.' }, { status: 400 })

  const { smtpPassword, limit }: { smtpPassword?: string; limit?: number } = await request.json()

  if (!smtpPassword) return NextResponse.json({ error: '메일 비밀번호가 필요합니다.' }, { status: 400 })

  try {
    const messages = await listInboxPreviews(limit, {
      user: user.email,
      password: smtpPassword,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[mail/inbox]', error)

    return NextResponse.json(
      {
        error: getMailConfigErrorMessage(error) ?? '메일함을 불러오지 못했습니다. IMAP 설정을 확인해 주세요.',
      },
      { status: 500 }
    )
  }
}
