# CLAUDE.md — 빌드 헌법 (Build Constitution)

이 파일은 Claude Code가 이 프로젝트를 빌드할 때 지켜야 하는 **운영 규칙**이다.
PRD.md(무엇을), DESIGN.md(어떻게), PROMPT_ralph.md(실행 루프)와 함께 읽는다.

## 0. 한 줄 미션
> 두 개의 개발 프로젝트(Nexys Blockly Studio, Flight Sim2)의 진행 상황을
> Log.md 기반으로 자동 집계하고, 팀원과 실시간 피드백을 주고받는
> **GitHub Pages 대시보드**를 빌드한다.

## 1. 절대 규칙 (Hard Rules)
1. **빌드 스텝 없음.** 번들러/트랜스파일러 금지. `index.html` + ES Module `app.js`만으로 GitHub Pages에 그대로 배포된다. (Vite/webpack/React 빌드 금지)
2. **프레임워크 금지.** Vanilla JS + Tailwind(CDN) + supabase-js(CDN)만 사용. LangChain/LangGraph류 추상화 금지(이 프로젝트엔 LLM 없음, 원칙 유지용).
3. **완성 파일만.** 부분 diff / "여기에 삽입하세요" 금지. 모든 파일은 통째로 붙여넣기 가능한 완성본.
4. **비밀값 하드코딩 금지.** 단, Supabase `anon key`는 예외 — RLS로 보호되는 공개용 키이므로 `public/config.js`에 둔다(주석으로 명시). PAT/서비스키는 절대 클라이언트에 두지 않는다.
5. **설정 주도.** 프로젝트 목록, owner, repo 이름은 모두 `config.json` / `config.js`에서 읽는다. 코드에 하드코딩 금지.
6. **피드백 레이어는 포트-어댑터.** `feedback-adapter.js`가 인터페이스, `feedback-supabase.js`가 구현. 나중에 Giscus 어댑터로 교체 가능해야 한다.
7. **Log.md를 단일 진실 소스(SSOT)로.** 진행률/단계/요약/마일스톤은 각 프로젝트 repo의 `Log.md` frontmatter+섹션에서만 파싱한다. 대시보드가 별도로 상태를 들고 있지 않는다.

## 2. 고정 기술 스택 (Locked Stack)
| 레이어 | 선택 | 비고 |
|---|---|---|
| 호스팅 | GitHub Pages (Actions 배포) | `actions/deploy-pages@v4` |
| 데이터 파이프라인 | GitHub Actions + Python 3.12 | `requests`, `pyyaml`만 설치 |
| 자동감지 | `repository_dispatch` + cron(*/15) 백업 | 프로젝트 repo → 대시보드 repo |
| 프론트 | Vanilla ES Module + Tailwind CDN | 빌드 스텝 0 |
| 피드백 | Supabase (Postgres + Realtime) | 익명 insert/select, RLS |

## 3. 산출물 디렉터리 구조 (목표)
```
dev-dashboard/                 ← 새 GitHub repo (Pages 활성화)
├─ config.json                 ← 빌드 스크립트용 프로젝트 목록
├─ build_data.py               ← Log.md+커밋 → public/data.json
├─ .github/workflows/build.yml ← 데이터 생성 + Pages 배포
├─ public/                     ← Pages가 서빙하는 루트
│  ├─ index.html
│  ├─ app.js
│  ├─ feedback-adapter.js
│  ├─ feedback-supabase.js
│  ├─ config.js               ← supabaseUrl/anonKey/owner (공개용)
│  └─ data.json               ← Actions가 매 빌드 생성 (gitignore 가능)
└─ supabase_schema.sql         ← Supabase SQL Editor에 1회 실행
```
프로젝트 repo 쪽:
```
nexys-blockly-studio/.github/workflows/notify-dashboard.yml
flight-sim2/.github/workflows/notify-dashboard.yml
(각 repo 루트에 Log.md — DESIGN.md 포맷 준수)
```

## 4. 완료 정의 (Definition of Done)
- [ ] `python build_data.py` 로컬 실행 시 `public/data.json` 정상 생성 (PAT 환경변수만 있으면)
- [ ] `data.json` 스키마가 DESIGN.md와 1:1 일치
- [ ] `index.html`을 로컬 정적 서버로 열면 두 프로젝트 카드 + 진행률 + 커밋 + 마일스톤 + 피드백 UI 렌더링
- [ ] 피드백 입력 → Supabase insert → 다른 탭에서 새로고침 없이 즉시 표시(Realtime 구독 동작)
- [ ] 모든 다이렉트 링크(repo/데모/Log.md/커밋) 클릭 시 정확한 URL로 이동
- [ ] Stale(마지막 커밋 N일 경과) 시각 경고 동작
- [ ] 모바일 1열 / 데스크탑 2열 반응형
- [ ] 시크릿 누출 0건 (PAT는 Actions secret, anon key만 클라이언트)

## 5. 작업 순서 (Build Order)
1. `reference/`의 파일들을 목표 구조로 배치(이미 동작하는 기준 구현 제공됨).
2. DESIGN.md 디자인 시스템에 맞춰 `index.html`/`app.js` UI 다듬기.
3. `build_data.py`가 Log.template.md를 정확히 파싱하는지 단위 검증.
4. 엣지케이스 처리: Log.md 없음 / frontmatter 누락 / 커밋 0개 / Supabase 연결 실패(→ "피드백 일시 불가" 폴백).
5. 마지막에 README.md의 수동 셋업 체크리스트를 최신화.

## 6. 코딩 스타일
- 함수는 한 가지 일만. 파일당 200줄 넘으면 분리.
- 모든 fetch/insert는 try/catch + 사용자에게 보이는 에러 상태.
- 한국어 UI 라벨, 코드 주석은 한국어 OK.
- 시간은 `Intl.RelativeTimeFormat('ko')`로 "3시간 전" 표기.
