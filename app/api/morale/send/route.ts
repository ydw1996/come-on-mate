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

// POST /api/morale/send — SSE로 진행률 스트리밍하며 메일 발송
export async function POST(request: Request) {
  const body = await request.json() as {
    to?: string
    cc?: string[]
    subject?: string
    body?: string
    receiptUrl?: string
    participants?: Participant[]
    totalAmount?: number
    smtpPassword?: string
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(progress: number, message: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress, message })}\n\n`))
      }
      function sendError(message: string, detail?: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message, detail })}\n\n`))
        controller.close()
      }
      function sendDone() {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      }

      try {
        send(10, '인증 확인 중...')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return sendError('인증이 필요합니다.')
        if (!user.email) return sendError('로그인 이메일을 확인할 수 없습니다.')

        const { subject, body: mailBody, receiptUrl, participants = [], totalAmount, smtpPassword, to, cc } = body

        if (!subject?.trim()) return sendError('제목이 없습니다.')
        if (!mailBody?.trim()) return sendError('본문이 없습니다.')
        if (!smtpPassword) return sendError('메일 비밀번호가 필요합니다.')

        send(25, '프로필 확인 중...')
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()

        const primaryRecipient = to?.trim() || process.env.MORALE_MAIL_TO || 'sbpark@commerceon.co.kr'
        const defaultCc = process.env.MORALE_MAIL_CC?.split(/[,;\n]+/).map((e) => e.trim()).filter(Boolean)
        const ccRecipients = cc?.length ? cc : defaultCc

        // 영수증 이미지 첨부
        const attachments: { filename: string; content: Buffer; contentType?: string }[] = []
        if (receiptUrl) {
          send(45, '영수증 이미지 준비 중...')
          try {
            const res = await fetch(receiptUrl)
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer())
              const ext = receiptUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
              attachments.push({ filename: `receipt.${ext}`, content: buffer, contentType: res.headers.get('content-type') ?? undefined })
            }
          } catch {
            // 첨부 실패해도 메일 발송 계속
          }
        }

        send(65, '메일 서버 연결 중...')
        const result = await sendMail({
          to: primaryRecipient,
          cc: ccRecipients,
          fromName: profile?.name || user.user_metadata?.name || undefined,
          subject,
          text: mailBody,
          attachments: attachments.length > 0 ? attachments : undefined,
          auth: { user: user.email, password: smtpPassword },
        })

        send(90, '발송 기록 저장 중...')
        await supabase.from('morale_emails').insert({
          sent_by: user.id,
          recipients: participants.map((p) => ({ name: p.name, email: '', item: p.menuItem ?? p.position, price: p.amount })),
          total_amount: totalAmount ?? participants.reduce((sum, p) => sum + p.amount, 0),
        })

        send(100, '발송 완료!')
        void result
        sendDone()
      } catch (error) {
        console.error('[morale/send]', error)
        sendError(
          getMailConfigErrorMessage(error) ?? getMailErrorMessage(error),
          getDevelopmentMailError(error),
        )
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
