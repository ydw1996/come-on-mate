import type { MailRecipient } from '@/types'

interface TemplateOptions {
  cafeName: string
  date: string
  recipients: MailRecipient[]
  receiptImageUrl?: string
}

export function buildMoraleEmailHtml({ cafeName, date, recipients, receiptImageUrl }: TemplateOptions): string {
  const 총금액 = recipients.reduce((sum, r) => sum + r.price, 0)

  const rows = recipients
    .map(
      (r, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827">${r.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151">${r.item}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;font-weight:500">${r.price.toLocaleString()}원</td>
      </tr>`
    )
    .join('')

  const receiptSection = receiptImageUrl
    ? `
      <div style="margin-top:32px">
        <p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px">영수증</p>
        <img
          src="${receiptImageUrl}"
          alt="영수증"
          style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;display:block"
        />
      </div>`
    : ''

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>사기진작비 음료 비용 청구</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

    <!-- 헤더 -->
    <div style="background:#111827;padding:28px 32px">
      <p style="margin:0;font-size:12px;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase">Come On Mate</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff">사기진작비 음료 비용 청구</h1>
    </div>

    <!-- 본문 -->
    <div style="padding:32px">
      <p style="margin:0 0 6px;font-size:14px;color:#6b7280">${date}</p>
      <p style="margin:0 0 28px;font-size:18px;font-weight:600;color:#111827">${cafeName}</p>

      <!-- 주문 테이블 -->
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">이름</th>
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">주문</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">금액</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background:#f9fafb">
            <td colspan="2" style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb">합계</td>
            <td style="padding:14px 16px;font-size:16px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #e5e7eb">${총금액.toLocaleString()}원</td>
          </tr>
        </tfoot>
      </table>

      ${receiptSection}
    </div>

    <!-- 푸터 -->
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        이 메일은 Come On Mate에서 자동 발송되었습니다.
      </p>
    </div>

  </div>
</body>
</html>`
}
