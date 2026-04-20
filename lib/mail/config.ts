import 'server-only'

import { z } from 'zod'

const booleanString = z
  .string()
  .optional()
  .transform((value) => value === 'true')

const portString = z.coerce.number().int().positive()

const smtpSchema = z.object({
  host: z.string().min(1, 'SMTP_HOST가 필요합니다.'),
  port: portString,
  secure: booleanString,
  user: z.string().min(1, 'SMTP_USER가 필요합니다.'),
  password: z.string().min(1, 'SMTP_PASSWORD가 필요합니다.'),
  from: z.string().min(1),
})

const imapSchema = z.object({
  host: z.string().min(1, 'IMAP_HOST가 필요합니다.'),
  port: portString,
  secure: booleanString,
  user: z.string().min(1, 'SMTP_USER 또는 IMAP_USER가 필요합니다.'),
  password: z.string().min(1, 'SMTP_PASSWORD 또는 IMAP_PASSWORD가 필요합니다.'),
})

type MailAuth = {
  user?: string
  password?: string
}

export function getSmtpConfig(auth?: MailAuth) {
  const user = auth?.user ?? process.env.SMTP_USER

  return smtpSchema.parse({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user,
    password: auth?.password ?? process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM ?? user,
  })
}

export function getImapConfig(auth?: MailAuth) {
  return imapSchema.parse({
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    secure: process.env.IMAP_SECURE,
    user: auth?.user ?? process.env.IMAP_USER ?? process.env.SMTP_USER,
    password: auth?.password ?? process.env.IMAP_PASSWORD ?? process.env.SMTP_PASSWORD,
  })
}

export function getMailConfigErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(' ')
  }

  return undefined
}
