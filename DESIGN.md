# DESIGN.md — 설계 / 스키마 / 디자인 시스템

## 1. 아키텍처 (데이터 흐름)

```
┌─────────────────────┐   push    ┌──────────────────────────┐
│ nexys-blockly-studio │──────────▶│ notify-dashboard.yml      │
│ flight-sim2          │           │ → repository_dispatch     │
│ (각 repo, Log.md 포함)│           └────────────┬─────────────┘
└─────────────────────┘                         │ event: project-updated
                                                 ▼
                              ┌────────────────────────────────────┐
                              │ dev-dashboard repo                  │
                              │  build.yml (dispatch + cron */15)   │
                              │   └─ build_data.py                  │
                              │        ├─ GitHub API: Log.md 조회   │
                              │        ├─ GitHub API: 커밋 조회      │
                              │        └─ public/data.json 생성     │
                              │   └─ deploy-pages → GitHub Pages    │
                              └───────────────┬────────────────────┘
                                              ▼
                            ┌──────────────────────────────────────┐
                            │ Browser (대시보드)                    │
                            │  app.js                              │
                            │   ├─ fetch public/data.json (60s 폴링)│
                            │   └─ Supabase: feedback select+realtime│
                            └──────────────────────────────────────┘
```

핵심 분리:
- **읽기 전용 진행 데이터** = GitHub Actions가 만든 `data.json` (같은 오리진 → 레이트리밋 無)
- **쓰기 가능 피드백** = Supabase (클라이언트 직접 read/write, Realtime)

## 2. Log.md 포맷 명세 (SSOT)
각 프로젝트 repo 루트의 `Log.md`. **frontmatter + 마일스톤 섹션 + 날짜 섹션** 3블록.

```markdown
---
project: Nexys Blockly Studio
stage: MVP                # 기획 | PoC | MVP | 베타 | 배포
progress: 45              # 0~100 정수
repo_url: https://github.com/OWNER/nexys-blockly-studio
demo_url: https://OWNER.github.io/nexys-blockly-studio   # 없으면 빈 문자열
summary: 디펜스/항공우주 엔지니어용 웹 기반 비주얼 프로그래밍 IDE
---

## 마일스톤
- [x] Blockly 코어 통합
- [ ] Raspberry Pi 측정 모듈 매핑
- [ ] 코드 생성기 v1

## 2026-06-22
- 블록 카테고리 12종 정의
- DAQ 핀맵 JSON 스키마 확정

## 2026-06-21
- 프로젝트 부트스트랩, Blockly 데모 임베드
```

파싱 규칙:
- frontmatter: 첫 `---` ~ 두번째 `---` 사이를 YAML로 파싱.
- `## 마일스톤` 섹션: `- [x]`/`- [ ]` 라인 → `{text, done}`.
- `## YYYY-MM-DD` 섹션: 그 아래 `- ` bullet → 항목 배열. 최신순 정렬, 상위 5개만 data.json에 포함.
- 누락 필드 기본값: stage="기획", progress=0, demo_url="".

## 3. data.json 스키마 (build_data.py 출력)
```json
{
  "generated_at": "2026-06-22T09:00:00Z",
  "owner": "OWNER",
  "projects": [
    {
      "id": "nexys-blockly",
      "name": "Nexys Blockly Studio",
      "stage": "MVP",
      "progress": 45,
      "summary": "디펜스/항공우주 엔지니어용 ...",
      "repo_url": "https://github.com/OWNER/nexys-blockly-studio",
      "demo_url": "https://OWNER.github.io/nexys-blockly-studio",
      "log_url": "https://github.com/OWNER/nexys-blockly-studio/blob/main/Log.md",
      "milestones": [
        {"text": "Blockly 코어 통합", "done": true},
        {"text": "코드 생성기 v1", "done": false}
      ],
      "milestone_done": 1,
      "milestone_total": 3,
      "entries": [
        {"date": "2026-06-22", "items": ["블록 카테고리 12종 정의", "..."]}
      ],
      "commits": [
        {"sha": "a1b2c3d", "message": "feat: 핀맵 스키마",
         "author": "haku", "date": "2026-06-22T08:40:00Z",
         "url": "https://github.com/OWNER/.../commit/a1b2c3d..."}
      ],
      "last_commit_date": "2026-06-22T08:40:00Z",
      "days_since_commit": 0,
      "error": null
    }
  ]
}
```
- 프로젝트 조회 실패 시 `error`에 메시지 채우고 나머지는 빈 값 → UI는 카드에 에러 배지 표시.

## 4. Supabase 스키마
`supabase_schema.sql` 참조. 요약:
- 테이블 `feedback(id, project_id, section, author, body, status, created_at)`
- RLS: anon `select`/`insert`/`update(status)` 허용 (내부 도구 전제)
- `feedback` 테이블을 `supabase_realtime` publication에 추가 → 구독 가능
- `status` enum-like text: `open | done | wontfix`

## 5. 설정 파일
**`config.json`** (빌드 스크립트용, repo 루트):
```json
{
  "github_owner": "OWNER",
  "dashboard_repo": "dev-dashboard",
  "log_branch": "main",
  "max_entries": 5,
  "max_commits": 8,
  "stale_days": 7,
  "projects": [
    {"id": "nexys-blockly", "repo": "nexys-blockly-studio", "log_path": "Log.md"},
    {"id": "flight-sim2",   "repo": "flight-sim2",          "log_path": "Log.md"}
  ]
}
```

**`public/config.js`** (클라이언트용, 공개 안전값만):
```js
window.DASHBOARD_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "eyJ...",   // anon key (RLS 보호, 공개 안전)
  pollMs: 60000
};
```

## 6. 디자인 시스템 (UI)
**톤**: 다크 모드 기본, 엔지니어용 대시보드. 미니멀·고밀도·즉시 스캔 가능.

| 토큰 | 값 |
|---|---|
| 배경 | `#0e1116` / 카드 `#161b22` |
| 보더 | `#30363d` |
| 텍스트 | `#e6edf3` / 보조 `#8b949e` |
| 액센트(Nexys) | `#E60012` (Nexys 브랜드 레드) |
| 액센트(Flight Sim2) | `#2f81f7` (블루) |
| 단계 배지색 | 기획=회색, PoC=보라, MVP=청록, 베타=주황, 배포=초록 |
| 진행률 바 | 액센트색, 배경 트랙 `#21262d` |
| Stale 경고 | `#f85149` 점 + "N일 전 커밋" |
| 폰트 | 시스템 산세리프 + 코드/sha는 monospace |

**레이아웃**:
```
┌─ 헤더: 타이틀 | 평균진행률 | 마지막갱신 | open 피드백 N건 ─┐
├─ 프로젝트 그리드 (모바일 1열 / 데스크탑 2열) ────────────┤
│  ┌─ 카드 ───────────────────────────────────────────┐  │
│  │ ● 이름           [단계배지]    repo데모Log·커밋 링크│  │
│  │ 한 줄 요약                                         │  │
│  │ 진행률 ▓▓▓▓▓░░░░ 45%      마일스톤 1/3            │  │
│  │ ▸ 최근 로그 (접이식, 날짜별 bullet)                │  │
│  │ ▸ 최근 커밋 (8개, 상대시각)                        │  │
│  │ ── 피드백 ─────────────────────────────────────  │  │
│  │  [작성자] [섹션▾] [본문...........] [남기기]       │  │
│  │  · 익명 · 2시간 전 · UI    "버튼 색 더 진하게"  [done]│  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## 7. 컴포넌트 분해 (app.js 내부 함수)
- `init()` — config 로드, supabase 클라이언트 생성, 첫 렌더, 폴링/구독 시작
- `loadData()` — `data.json` fetch, 이전과 다르면 `renderProjects()`
- `renderHeader(data)` — 상단 요약
- `renderProjectCard(project, feedbackByProject)` — 카드 1개
- `renderTimeline(entries)` / `renderCommits(commits)` / `renderMilestones(...)`
- `feedbackAdapter` — `list(projectId)`, `add({...})`, `setStatus(id,status)`, `subscribe(cb)` (포트)
- `feedback-supabase.js` — 위 포트의 Supabase 구현
- `relativeTime(iso)` — "3시간 전"
- `stageBadge(stage)` / `accentFor(projectId)` — 색 매핑

## 8. 폴백/엣지케이스
- data.json 로드 실패 → 헤더에 "데이터 로드 실패, 잠시 후 자동 재시도".
- 프로젝트 `error` 있음 → 카드에 노란 배지 + 메시지, 링크는 가능 범위에서 표시.
- Supabase 미설정/실패 → 피드백 영역에 "피드백 백엔드 미연결" 안내, 나머지 정상.
- 커밋 0개 → "커밋 없음".
- 마일스톤 0개 → 섹션 숨김.
