# Come On Mate 프로젝트 규정

> 커머스온 내부 업무 자동화 & 복지 서비스

---

## 언어 규칙

- 모든 소통은 **한국어**로 한다
- 코드 주석, 커밋 메시지, PR 설명 모두 한국어
- 변수명/함수명은 영어 또는 한국어 혼용 허용

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| 상태관리 | Zustand (클라이언트), TanStack Query (서버) |
| 폼 | React Hook Form + Zod |
| DB/Auth | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| AI | Claude API (claude-haiku-4-5-20251001) |
| 이메일 | Resend |
| 지도 | 네이버 지도 API |
| 패키지 | pnpm (다른 패키지 매니저 금지) |

---

## 폴더 구조

표준 Next.js App Router 구조를 따른다.

```
app/
├── (auth)/          # 로그인 등 인증 페이지
├── (dashboard)/     # 대시보드 (인증 필요)
└── api/             # Route Handler

components/
├── ui/              # shadcn/ui 컴포넌트
├── layout/          # Sidebar, Header, Providers
├── auth/            # 로그인 관련
├── checkin/         # 출퇴근
├── todos/           # 할일
├── journal/         # 업무일지
├── lunch/           # 점심
├── slack/           # 슬랙 요약
└── morale/          # 사기진작비

lib/
├── supabase/        # client.ts, server.ts
├── claude.ts        # Claude API
├── resend.ts        # 이메일
└── naver-maps.ts    # 네이버 지도

types/index.ts       # 전체 타입 정의
```

---

## 커밋 컨벤션

형식: `type: 내용`

| 타입 | 설명 |
|------|------|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| refactor | 코드 구조 개선 |
| style | UI/코드 포맷 수정 |
| docs | 문서 수정 |
| test | 테스트 추가/수정 |
| chore | 설정 파일 변경 |
| perf | 성능 개선 |

**예시:**
```
feat: 영수증 AI 분석 API 추가
fix: 출퇴근 중복 저장 버그 수정
chore: Supabase RLS 정책 추가
```

---

## 환경변수

`.env.local` 파일에 설정 (절대 커밋 금지)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
SLACK_BOT_TOKEN=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

---

## 개발 규칙

### Supabase
- RLS(Row Level Security) 반드시 활성화
- 서버 컴포넌트 / Route Handler → `lib/supabase/server.ts` 사용
- 클라이언트 컴포넌트 → `lib/supabase/client.ts` 사용

### AI / 외부 API
- AI API 호출은 반드시 Route Handler(서버)에서만 처리 — API 키 노출 방지
- 이미지 파일은 Supabase Storage `morale` 버킷에 저장

### React
- React Compiler 활성화됨 → useMemo/useCallback/memo 최소화
- 서버 컴포넌트 우선, 상호작용 필요 시에만 `'use client'` 사용

### 패키지
- pnpm만 사용 (`npm install`, `yarn add` 금지)

---

## 스크립트

```bash
pnpm dev      # 개발 서버 (Turbopack)
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint
```

---

## Supabase 초기 세팅 순서

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/migrations/001_init_schema.sql` 내용을 SQL Editor에서 실행
3. Storage > 새 버킷 생성: `morale` (비공개)
4. `.env.local`에 URL, ANON_KEY, SERVICE_ROLE_KEY 입력
5. Authentication > Email 로그인 활성화

---

## Phase 정보

| Phase | 목표 | 상태 |
|-------|------|------|
| Phase 1 | 개인 업무 자동화 (혼자 사용) | 진행 중 |
| Phase 2 | 전사 멀티유저 복지 서비스 (36명) | 예정 |

---

## 기획 문서 관리 규칙

- 기획이 변경되거나 새로운 내용이 확정될 때마다 **`PLANNING.md`를 반드시 함께 업데이트**한다
- 기능 추가/변경/삭제 시 PLANNING.md의 해당 섹션과 변경 이력 테이블을 갱신한다
- 미확정 사항은 `⚠️ 기획 확정 필요` 로 명시하고, 확정되면 즉시 반영한다
