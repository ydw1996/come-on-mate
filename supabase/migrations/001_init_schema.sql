-- Come On Mate 초기 스키마
-- Supabase SQL Editor에서 순서대로 실행하세요

-- =====================
-- 1. profiles (사용자 프로필)
-- =====================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  team text check (team in ('프론트', '백엔드1', '백엔드2', 'UIUX', '기획')),
  position text,
  role text not null default 'member' check (role in ('admin', 'member')),
  email text,
  slack_user_id text,
  favorite_order text,     -- 사기진작비 AI 매칭용 (예: "아메리카노")
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 신규 회원가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table profiles enable row level security;
create policy "본인 프로필 읽기" on profiles for select using (auth.uid() = id);
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);

-- =====================
-- 2. checkins (출퇴근)
-- =====================
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('in', 'out')),
  checked_at timestamptz not null default now(),
  note text
);

alter table checkins enable row level security;
create policy "본인 출퇴근 전체" on checkins for all using (auth.uid() = user_id);

-- =====================
-- 3. todos (할일)
-- =====================
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  title text not null,
  description text,
  project text,
  due_date date,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table todos enable row level security;
create policy "본인 할일 전체" on todos for all using (auth.uid() = user_id);

-- =====================
-- 4. journals (업무일지)
-- =====================
create table if not exists journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  project text,
  raw_input text,              -- 사용자 원본 입력
  generated_content text,      -- AI 변환 결과
  created_at timestamptz not null default now(),
  unique (user_id, date, project)
);

alter table journals enable row level security;
create policy "본인 업무일지 전체" on journals for all using (auth.uid() = user_id);

-- =====================
-- 5. journal_templates (업무일지 템플릿)
-- =====================
create table if not exists journal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project text,
  template text not null,
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

alter table journal_templates enable row level security;
create policy "템플릿 읽기 (전체)" on journal_templates for select using (auth.uid() is not null);
create policy "템플릿 본인 수정" on journal_templates for all using (auth.uid() = created_by);

-- =====================
-- 6. cafe_menus (카페 메뉴)
-- =====================
create table if not exists cafe_menus (
  id uuid primary key default gen_random_uuid(),
  cafe_name text not null,
  item_name text not null,
  price integer not null default 0,
  category text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (cafe_name, item_name)
);

alter table cafe_menus enable row level security;
create policy "카페 메뉴 읽기 (전체)" on cafe_menus for select using (auth.uid() is not null);
create policy "카페 메뉴 수정 (전체)" on cafe_menus for all using (auth.uid() is not null);

-- =====================
-- 7. morale_orders (사기진작비 주문 기록)
-- =====================
create table if not exists morale_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  cafe_name text not null,
  item_name text not null,
  price integer not null default 0,
  receipt_url text,
  date date not null default current_date
);

alter table morale_orders enable row level security;
create policy "사기진작비 주문 전체 읽기" on morale_orders for select using (auth.uid() is not null);
create policy "사기진작비 주문 본인 수정" on morale_orders for all using (auth.uid() = user_id);

-- =====================
-- 8. morale_emails (메일 발송 이력)
-- =====================
create table if not exists morale_emails (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references profiles on delete cascade,
  recipients jsonb not null default '[]',
  total_amount integer not null default 0,
  sent_at timestamptz not null default now()
);

alter table morale_emails enable row level security;
create policy "메일 이력 읽기 (전체)" on morale_emails for select using (auth.uid() is not null);
create policy "메일 이력 본인 생성" on morale_emails for insert with check (auth.uid() = sent_by);

-- =====================
-- 9. lunch_places (점심 장소)
-- =====================
create table if not exists lunch_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  naver_place_id text,
  address text,
  added_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

alter table lunch_places enable row level security;
create policy "점심 장소 읽기 (전체)" on lunch_places for select using (auth.uid() is not null);
create policy "점심 장소 수정 (전체)" on lunch_places for all using (auth.uid() is not null);

-- =====================
-- 10. lunch_picks (점심 선택 기록)
-- =====================
create table if not exists lunch_picks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  place_id uuid not null references lunch_places on delete cascade,
  recommended_by uuid references profiles,
  created_at timestamptz not null default now()
);

alter table lunch_picks enable row level security;
create policy "점심 기록 읽기 (전체)" on lunch_picks for select using (auth.uid() is not null);
create policy "점심 기록 생성 (전체)" on lunch_picks for insert with check (auth.uid() is not null);

-- =====================
-- 11. slack_summaries (슬랙 요약)
-- =====================
create table if not exists slack_summaries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  channel_id text not null,
  channel_name text not null,
  summary text not null,
  raw_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (date, channel_id)
);

alter table slack_summaries enable row level security;
create policy "슬랙 요약 읽기 (전체)" on slack_summaries for select using (auth.uid() is not null);
create policy "슬랙 요약 수정 (전체)" on slack_summaries for all using (auth.uid() is not null);

-- =====================
-- Supabase Storage 버킷
-- =====================
-- Supabase 대시보드 > Storage에서 아래 버킷을 생성하세요:
-- 버킷명: morale (public: false)
-- 용도: 영수증 사진, 메뉴판 사진 저장
