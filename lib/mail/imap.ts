import 'server-only'

import { ImapFlow } from 'imapflow'
import { getImapConfig } from './config'

export type InboxPreview = {
  uid: number
  subject?: string
  from?: string
  date?: Date
}

export async function listInboxPreviews(
  limit = 10,
  auth?: { user: string; password: string }
): Promise<InboxPreview[]> {
  const config = getImapConfig(auth)
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })

  await client.connect()

  try {
    const lock = await client.getMailboxLock('INBOX')

    try {
      if (!client.mailbox) return []

      const total = client.mailbox.exists
      const start = Math.max(total - limit + 1, 1)
      const previews: InboxPreview[] = []

      for await (const message of client.fetch(`${start}:*`, {
        envelope: true,
        uid: true,
      })) {
        previews.push({
          uid: message.uid,
          subject: message.envelope?.subject,
          from: message.envelope?.from?.[0]?.address,
          date: message.envelope?.date,
        })
      }

      return previews.reverse()
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}
