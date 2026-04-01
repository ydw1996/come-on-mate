import { Resend } from 'resend'

// Resend 이메일 클라이언트 (서버 전용, 지연 초기화)
export function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

// 발신자 주소 (Resend 도메인 인증 후 변경)
export const FROM_EMAIL = 'onboarding@resend.dev'
