# 개발 진행 대시보드 — 셋업 가이드 (Haku용)

두 프로젝트(Nexys Blockly Studio / Flight Sim2)의 진행 상황을 GitHub Pages로 공유하고,
팀원과 **실시간 피드백**을 주고받는 대시보드.

## 전체 그림
```
프로젝트 repo 푸쉬 → repository_dispatch → dev-dashboard Actions
→ Log.md 파싱 + 커밋 조회 → public/data.json → GitHub Pages 배포
브라우저: data.json 60초 폴링 + Supabase 피드백 실시간 구독
```

## 프로젝트 구조 (빌드 산출물)
```
.
├─ config.json                  # 빌드 스크립트용 프로젝트 목록 (OWNER 치환 필요)
├─ build_data.py                # Log.md + 커밋 → public/data.json 생성
├─ supabase_schema.sql          # Supabase SQL Editor에 1회 실행
├─ .gitignore                   # public/data.json, .venv 등 제외
├─ .github/workflows/build.yml  # 데이터 생성 + Pages 배포 (dispatch + cron */15 + 수동)
├─ public/                      # GitHub Pages가 서빙하는 루트
│  ├─ index.html
│  ├─ app.js                    # 메인 로직 (Vanilla ES Module)
│  ├─ config.js                 # 클라이언트 공개 설정 (supabaseUrl/anonKey — 사용자가 채움)
│  ├─ feedback-adapter.js       # 피드백 포트(인터페이스) + null 어댑터
│  ├─ feedback-supabase.js      # 피드백 Supabase 구현 (동적 import 폴백)
│  └─ data.json                 # ← Actions가 매 빌드 생성 (gitignore, 커밋 안 함)
├─ _for-project-repos/
│  └─ notify-dashboard.yml      # 각 프로젝트 repo의 .github/workflows/ 에 복사 (OWNER 치환)
├─ tests/                       # 로컬 단위 검증 (배포 불필요)
│  ├─ test_parsers.py           # Log.md 파서 검증
│  └─ test_schema.py            # data.json 스키마 ↔ DESIGN.md §3 대조
└─ reference/                   # 기준 구현 원본 (문서/백업용, 배포 대상 아님)
```

## 빌드 (Claude Code MAX)
1. 이 폴더에서 새 Claude Code 세션 시작.
2. `PROMPT_ralph.md` 전체를 붙여넣어 실행 → 위 구조로 정리·검증된 산출물 생성.

## 수동 셋업 체크리스트 (Claude Code가 못 하는 부분)

### A. GitHub
- [ ] 새 repo `dev-dashboard` 생성 → 빌드 산출물(reference/ 와 tests/, .venv/ 제외 가능) push
- [ ] repo Settings → **Pages → Source = GitHub Actions**
- [ ] 두 프로젝트(`nexys-blockly-studio`, `flight-sim2`)가 GitHub에 push 되어 있고 각 루트에 `Log.md`(`reference/Log.template.md` 포맷) 존재
- [ ] `OWNER` 를 본인 GitHub 계정명으로 치환할 곳:
      - `config.json` → `github_owner`
      - `_for-project-repos/notify-dashboard.yml` → API URL의 `OWNER`

### B. 시크릿 / 토큰 (절대 코드에 넣지 말 것)
- [ ] **dev-dashboard repo secret `GH_PAT`**: 프로젝트 repo `contents: read` 권한 fine-grained PAT
      (private repo면 필수, public이면 레이트리밋 완화용으로 권장)
- [ ] **각 프로젝트 repo secret `DASHBOARD_DISPATCH_TOKEN`**: dev-dashboard repo `contents: write` 권한 PAT
      → `notify-dashboard.yml`이 이 토큰으로 dispatch 호출
- [ ] `_for-project-repos/notify-dashboard.yml` 을 두 프로젝트 repo의 `.github/workflows/notify-dashboard.yml` 로 복사 (OWNER 치환)

> 토큰 위생: fine-grained PAT를 repo 단위로 최소권한 발급. 만료일 설정. 노출 시 즉시 회전.

### C. Supabase (피드백 백엔드)
- [ ] Supabase 프로젝트 생성
- [ ] SQL Editor에 `supabase_schema.sql` 실행 (feedback 테이블 + RLS + realtime)
- [ ] Project Settings → API 에서 **Project URL** / **anon public key** 복사
- [ ] `public/config.js`의 `supabaseUrl`, `supabaseAnonKey` 채우기 (placeholder `YOUR_PROJECT`/`YOUR_ANON_KEY` 교체. anon key는 RLS 보호 → 공개 안전)
      - 비워두면 대시보드는 정상 동작하되 피드백 영역만 "Supabase 설정이 비어 있습니다" 안내 표시

### D. 동작 확인
- [ ] `dev-dashboard`에서 Actions "Build Dashboard Data & Deploy" 1회 수동 실행 → `https://OWNER.github.io/dev-dashboard` 접속
- [ ] 프로젝트 repo에 아무 커밋이나 push → 1~2분 내 대시보드 반영 확인
- [ ] 피드백 입력 → 다른 탭에서 새로고침 없이 즉시 보이면 성공

## 로컬 테스트

### 데이터 생성 + 미리보기
```bash
# 의존성 (시스템 파이썬이 externally-managed면 venv 권장)
python3 -m venv .venv
.venv/bin/pip install requests pyyaml

# 데이터 생성 (PAT + 실제 OWNER 가 config.json 에 있어야 happy-path 데이터가 나옴)
export GH_PAT=ghp_xxx
.venv/bin/python build_data.py        # public/data.json 생성
# PAT/OWNER 없이 실행하면 "Log.md를 찾을 수 없습니다" 에러 카드로 렌더(폴백 동작 확인용)

# 정적 서버로 미리보기
cd public && ../.venv/bin/python -m http.server 8080
# http://localhost:8080
```

### 단위 검증 (파서 + 스키마)
```bash
.venv/bin/python tests/test_parsers.py   # Log.md frontmatter/마일스톤/엔트리 파싱
.venv/bin/python tests/test_schema.py    # build_data.py 출력 ↔ DESIGN.md §3 스키마 대조
```

## 운영 팁
- 진행률/단계/마일스톤/요약은 **각 프로젝트의 Log.md만 수정**하면 바뀐다. 대시보드 코드 손댈 필요 없음.
- 세 번째 프로젝트 추가: `config.json`의 `projects`에 한 줄 + 그 repo에 Log.md + notify 워크플로 추가. 끝.
- 피드백에 민감정보 적지 말 것(익명 공개 쓰기 허용 상태). 외부 공개가 필요하면 RLS를 패스프레이즈/OAuth 기반으로 강화.

## 비용
GitHub Pages·Actions 무료 한도, Supabase 무료 티어 내에서 충분.
