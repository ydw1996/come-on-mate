import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { buildMoraleEmailHtml } from '@/lib/morale-email-template'
import type { MailRecipient } from '@/types'

// POST /api/morale/send — 사기진작비 이메일 발송
// body: { recipients, cafeName, receiptUrl? }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const {
    recipients,
    cafeName,
    receiptUrl,
  }: { recipients: MailRecipient[]; cafeName: string; receiptUrl?: string } = await request.json()

  if (!recipients?.length) return NextResponse.json({ error: '수신자가 없습니다.' }, { status: 400 })

  const 총금액 = recipients.reduce((sum, r) => sum + r.price, 0)
  const 오늘 = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  // 영수증 이미지 첨부 (Supabase Storage URL → Buffer)
  const attachments: { filename: string; content: Buffer }[] = []
  if (receiptUrl) {
    try {
      const res = await fetch(receiptUrl)
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer())
        const ext = receiptUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
        attachments.push({ filename: `영수증_${cafeName}_${오늘}.${ext}`, content: buffer })
      }
    } catch {
      // 첨부 실패해도 메일은 발송
    }
  }

  const html = buildMoraleEmailHtml({
    cafeName,
    date: 오늘,
    recipients,
    receiptImageUrl: receiptUrl,
  })

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients.map((r) => r.email),
    subject: `[사기진작비] ${오늘} ${cafeName} 음료 비용 청구`,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  if (error) {
    console.error('[morale/send]', error)
    return NextResponse.json({ error: '이메일 발송 실패' }, { status: 500 })
  }

  await supabase.from('morale_emails').insert({
    sent_by: user.id,
    recipients,
    total_amount: 총금액,
  })

  return NextResponse.json({ success: true, totalAmount: 총금액 })
}
