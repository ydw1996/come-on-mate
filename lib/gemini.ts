import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini 클라이언트 (서버 전용, 지연 초기화)
export function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

export const GEMINI_MODEL = 'gemini-1.5-flash-latest'
