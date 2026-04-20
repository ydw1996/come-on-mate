import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMailConfigErrorMessage } from '@/lib/mail/config'
import { getDevelopmentMailError, getMailErrorMessage, sendMail } from '@/lib/mail/send'

export const runtime = 'nodejs'

interface Participant {
  name: string
  position: string
  amount: number
  menuItem?: string
}

// POST /api/morale/send — 사기진작비 이메일 발송
// body: { to?, cc?, subject, body, receiptUrl?, participants?, totalAmount? }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const {
    to,
    cc,
    subject,
    body,
    receiptUrl,
    participants = [],
    totalAmount,
    smtpPassword,
  }: {
    to?: string
    cc?: string[]
    subject?: string
    body?: string
    receiptUrl?: string
    participants?: Participant[]
    totalAmount?: number
    smtpPassword?: string
  } = await request.json()

  if (!subject?.trim()) return NextResponse.json({ error: '제목이 없습니다.' }, { status: 400 })
  if (!body?.trim()) return NextResponse.json({ error: '본문이 없습니다.' }, { status: 400 })
  if (!user.email) return NextResponse.json({ error: '로그인 이메일을 확인할 수 없습니다.' }, { status: 400 })
  if (!smtpPassword) return NextResponse.json({ error: '메일 비밀번호가 필요합니다.' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const primaryRecipient = to?.trim() || process.env.MORALE_MAIL_TO || 'sbpark@commerceon.co.kr'
  const defaultCc = process.env.MORALE_MAIL_CC?.split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean)
  const ccRecipients = cc?.length ? cc : defaultCc

  // 영수증 이미지 첨부 (Supabase Storage URL → Buffer)
  const attachments: { filename: string; content: Buffer; contentType?: string }[] = []
  if (receiptUrl) {
    try {
      const res = await fetch(receiptUrl)
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer())
        const ext = receiptUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
        attachments.push({
          filename: `receipt.${ext}`,
          content: buffer,
          contentType: res.headers.get('content-type') ?? undefined,
        })
      }
    } catch {
      // 첨부 실패해도 메일은 발송
    }
  }

  try {
    const result = await sendMail({
      to: primaryRecipient,
      cc: ccRecipients,
      fromName: profile?.name || user.user_metadata?.name || undefined,
      subject,
      text: body,
      attachments: attachments.length > 0 ? attachments : undefined,
      auth: { user: user.email, password: smtpPassword },
    })

    await supabase.from('morale_emails').insert({
      sent_by: user.id,
      recipients: participants.map((participant) => ({
        name: participant.name,
        email: '',
        item: participant.menuItem ?? participant.position,
        price: participant.amount,
      })),
      total_amount: totalAmount ?? participants.reduce((sum, participant) => sum + participant.amount, 0),
    })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('[morale/send]', error)

    return NextResponse.json(
      {
        error: getMailConfigErrorMessage(error) ?? getMailErrorMessage(error),
        detail: getDevelopmentMailError(error),
      },
      { status: 500 }
    )
  }
}
