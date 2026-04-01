import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import type { MailRecipient } from '@/types'

// POST /api/morale/send — 사기진작비 이메일 발송
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { recipients, cafeName }: { recipients: MailRecipient[]; cafeName: string } = await request.json()

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ error: '수신자가 없습니다.' }, { status: 400 })
  }

  const 총금액 = recipients.reduce((sum, r) => sum + r.price, 0)
  const 오늘 = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  const 수신자목록HTML = recipients
    .map((r) => `<tr><td style="padding:8px;border:1px solid #ddd;">${r.name}</td><td style="padding:8px;border:1px solid #ddd;">${r.item}</td><td style="padding:8px;border:1px solid #ddd;">${r.price.toLocaleString()}원</td></tr>`)
    .join('')

  const 수신이메일목록 = recipients.map((r) => r.email)

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: 수신이메일목록,
    subject: `[사기진작비] ${오늘} ${cafeName} 음료 비용 청구`,
    html: `
      <h2>사기진작비 음료 비용 안내</h2>
      <p>안녕하세요! ${오늘} ${cafeName}에서의 음료 비용을 아래와 같이 안내드립니다.</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;border:1px solid #ddd;">이름</th>
            <th style="padding:8px;border:1px solid #ddd;">주문</th>
            <th style="padding:8px;border:1px solid #ddd;">금액</th>
          </tr>
        </thead>
        <tbody>${수신자목록HTML}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:8px;border:1px solid #ddd;font-weight:bold;">합계</td>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${총금액.toLocaleString()}원</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:16px;color:#888;font-size:12px;">Come On Mate 자동 발송</p>
    `,
  })

  if (error) {
    return NextResponse.json({ error: '이메일 발송 실패' }, { status: 500 })
  }

  // 발송 이력 저장
  await supabase.from('morale_emails').insert({
    sent_by: user.id,
    recipients,
    total_amount: 총금액,
  })

  return NextResponse.json({ success: true, totalAmount: 총금액 })
}
