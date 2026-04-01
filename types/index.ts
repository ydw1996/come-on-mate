// 사용자 프로필
export interface Profile {
  id: string
  name: string
  team: '프론트' | '백엔드1' | '백엔드2' | 'UIUX' | '기획'
  position: string
  role: 'admin' | 'member'
  email: string
  slack_user_id: string | null
  favorite_order: string | null
  avatar_url: string | null
  created_at: string
}

// 출퇴근
export interface Checkin {
  id: string
  user_id: string
  type: 'in' | 'out'
  checked_at: string
  note: string | null
}

// 할일
export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  project: string | null
  due_date: string | null
  is_done: boolean
  created_at: string
}

// 업무일지
export interface Journal {
  id: string
  user_id: string
  date: string
  project: string | null
  raw_input: string | null
  generated_content: string | null
  created_at: string
}

// 업무일지 템플릿
export interface JournalTemplate {
  id: string
  name: string
  project: string | null
  template: string
  created_by: string
}

// 카페 메뉴
export interface CafeMenu {
  id: string
  cafe_name: string
  item_name: string
  price: number
  category: string | null
  image_url: string | null
  created_at: string
}

// 사기진작비 주문
export interface MoraleOrder {
  id: string
  user_id: string
  cafe_name: string
  item_name: string
  price: number
  receipt_url: string | null
  date: string
  profiles?: Pick<Profile, 'name' | 'email' | 'favorite_order'>
}

// 사기진작비 메일 수신자
export interface MailRecipient {
  name: string
  email: string
  item: string
  price: number
}

// 사기진작비 메일 이력
export interface MoraleEmail {
  id: string
  sent_by: string
  recipients: MailRecipient[]
  total_amount: number
  sent_at: string
}

// 점심 장소
export interface LunchPlace {
  id: string
  name: string
  category: string | null
  naver_place_id: string | null
  address: string | null
  added_by: string
  profiles?: Pick<Profile, 'name'>
}

// 점심 선택 기록
export interface LunchPick {
  id: string
  date: string
  place_id: string
  recommended_by: string | null
  companions: string[]
  created_at: string
  lunch_places?: LunchPlace
  profiles?: Pick<Profile, 'name'>
}

// 점심 장소 + 마지막 픽 날짜 (목록 조회 시)
export interface LunchPlaceWithLastPick extends LunchPlace {
  last_picked_at: string | null
}

// 통계 TOP5
export interface LunchTop5Item {
  place_id: string
  name: string
  cnt: number
}

// 네이버 지도 검색 결과
export interface NaverPlace {
  title: string
  link: string
  category: string
  description: string
  telephone: string
  address: string
  roadAddress: string
  mapx: string
  mapy: string
}

// 슬랙 요약
export interface SlackSummary {
  id: string
  date: string
  channel_id: string
  channel_name: string
  summary: string
  raw_count: number
  created_at: string
}
