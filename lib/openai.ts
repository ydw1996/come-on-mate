import OpenAI from 'openai'

// OpenAI 클라이언트 (서버 전용, 지연 초기화)
export function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })
}

export const OPENAI_MODEL = 'gpt-4o-mini'
