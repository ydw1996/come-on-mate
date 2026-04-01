import Anthropic from '@anthropic-ai/sdk'

// Claude API 클라이언트 (서버 전용, 지연 초기화)
export function getClaude() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })
}

// 기본 모델
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
