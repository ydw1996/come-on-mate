import 'server-only'

import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import { getSmtpConfig } from './config'

export type SendMailInput = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  fromName?: string
  subject: string
  text: string
  html?: string
  attachments?: Mail.Attachment[]
  auth?: {
    user: string
    password: string
  }
}

export async function sendMail(input: SendMailInput) {
  const config = getSmtpConfig(input.auth)
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })

  return transporter.sendMail({
    from: input.fromName ? { name: input.fromName, address: config.from } : config.from,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
  })
}

export function getMailErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'EAUTH') {
    return 'SMTP 인증에 실패했습니다. SMTP_USER와 SMTP_PASSWORD를 확인해 주세요.'
  }

  return '메일 발송에 실패했습니다. SMTP 설정을 확인해 주세요.'
}

export function getDevelopmentMailError(error: unknown) {
  if (process.env.NODE_ENV !== 'development') return undefined

  if (typeof error === 'object' && error !== null && 'response' in error) {
    return String(error.response)
  }

  if (error instanceof Error) return error.message

  return undefined
}
