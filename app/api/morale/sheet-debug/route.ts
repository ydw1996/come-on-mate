import { NextResponse } from 'next/server'
import { google } from 'googleapis'

// GET /api/morale/sheet-debug — 시트 원본 데이터 확인용 (개발 전용)
export async function GET() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1M58GpTQukcX6A-yHQs_Cp2xG2SZk3nLLChPmp07icU8',
    range: "'2026년 사기진작비'!A1:Z10",
  })

  // 1~10행, A~Z열 원본 반환
  return NextResponse.json({ rows: res.data.values })
}
