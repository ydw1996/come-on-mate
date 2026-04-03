import { google } from 'googleapis'

const SPREADSHEET_ID = '1M58GpTQukcX6A-yHQs_Cp2xG2SZk3nLLChPmp07icU8'
const SHEET_NAME = '2026년 사기진작비'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export interface MonthData {
  월: string
  사용금액: number
  잔여금액: number
}

export interface MoraleEmployee {
  no: number
  이름: string
  월별: MonthData[]
  합계: number
}

function toNumber(val: string | undefined): number {
  if (!val) return 0
  return Number(val.replace(/[^0-9.-]/g, '')) || 0
}

export async function fetchMoraleSheet(): Promise<MoraleEmployee[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // 4행(월 헤더)부터 끝까지 읽기
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A4:AZ`,
  })

  const rows = res.data.values
  if (!rows || rows.length < 3) return []

  const monthRow = rows[0]  // 4행: 빈칸, 빈칸, 1월, '', 2월, '', ...
  const headerRow = rows[1] // 5행: NO, 직원명, 사용금액, 잔여금액, ...
  const dataRows = rows.slice(2) // 6행~

  // 월별 컬럼 매핑 구성
  // headerRow[i] === '사용금액' 이면 monthRow[i] 또는 직전 월 이름으로 매핑
  type MonthCol = { 월: string; 사용금액Idx: number; 잔여금액Idx: number }
  const monthCols: MonthCol[] = []
  let currentMonth = ''

  for (let i = 0; i < headerRow.length; i++) {
    if (monthRow[i] && monthRow[i] !== 'NO' && monthRow[i] !== '직원명' && monthRow[i] !== '합계') {
      currentMonth = monthRow[i]
    }
    if (headerRow[i] === '사용금액' && currentMonth) {
      monthCols.push({ 월: currentMonth, 사용금액Idx: i, 잔여금액Idx: i + 1 })
    }
  }

  // 합계 컬럼 위치
  const 합계Idx = headerRow.findIndex((h) => h === '합계' || (monthRow[headerRow.indexOf(h)] === '합계'))
  // 합계는 monthRow에 있을 수도 있음
  const 합계ColIdx = (() => {
    for (let i = 0; i < monthRow.length; i++) {
      if (monthRow[i] === '합계') return i
    }
    return headerRow.indexOf('합계')
  })()

  // NO, 직원명은 4행(monthRow)에 있음
  const 이름Idx = monthRow.findIndex((h) => h === '직원명')
  const noIdx = monthRow.findIndex((h) => h === 'NO')

  return dataRows
    .filter((row) => row[이름Idx] && row[noIdx])
    .map((row) => ({
      no: toNumber(row[noIdx]),
      이름: row[이름Idx] ?? '',
      월별: monthCols.map(({ 월, 사용금액Idx, 잔여금액Idx }) => ({
        월,
        사용금액: toNumber(row[사용금액Idx]),
        잔여금액: toNumber(row[잔여금액Idx]),
      })),
      합계: 합계ColIdx >= 0 ? toNumber(row[합계ColIdx]) : 0,
    }))
}
