-- supabase_schema.sql
-- Supabase 대시보드 > SQL Editor 에 1회 실행.
-- 내부 팀 도구 전제: 익명(anon) 읽기/쓰기/상태변경 허용.
-- (외부 공개가 필요해지면 RLS를 공유 패스프레이즈/OAuth 기반으로 강화할 것)

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  project_id  text        not null,
  section     text        not null default 'general',  -- general | UI | 기능 | 버그
  author      text        not null default '익명',
  body        text        not null,
  status      text        not null default 'open',      -- open | done | wontfix
  created_at  timestamptz not null default now()
);

create index if not exists feedback_project_idx
  on public.feedback (project_id, created_at desc);

alter table public.feedback enable row level security;

-- 익명 읽기
drop policy if exists "anon select" on public.feedback;
create policy "anon select" on public.feedback
  for select using (true);

-- 익명 쓰기 (본문/작성자만, 길이 제한 가드)
drop policy if exists "anon insert" on public.feedback;
create policy "anon insert" on public.feedback
  for insert with check (char_length(body) between 1 and 2000);

-- 익명 상태변경 (open/done/wontfix 토글)
drop policy if exists "anon update status" on public.feedback;
create policy "anon update status" on public.feedback
  for update using (true)
  with check (status in ('open','done','wontfix'));

-- Realtime 구독 활성화
alter publication supabase_realtime add table public.feedback;
