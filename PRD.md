# PRD.md — 제품 요구사항 (Dev Progress Dashboard)

## 1. 목적 (Purpose)
솔로프리너 Haku가 진행 중인 두 프로젝트의 **개발 진행 상황을 한 화면에서 공유**하고,
함께 방향을 잡는 **팀원과 실시간 피드백**을 주고받기 위한 경량 대시보드.

- 산출물: GitHub Pages로 배포되는 정적 웹 대시보드 1개
- 데이터 원천: 각 프로젝트 repo의 `Log.md` + 커밋 히스토리
- 갱신 방식: 프로젝트 repo에 푸쉬 → 자동 감지 → 대시보드 재생성/재배포

## 2. 사용자 (Users)
| 역할 | 니즈 |
|---|---|
| Haku (오너/개발자) | 진행 현황을 빠르게 정리·공유, 피드백 수집 |
| 팀원 (방향 설정 동료, 비개발자 포함) | 어떤 프로젝트가 어느 단계인지 보고, **GitHub 계정 없이** 의견 남기기 |

## 3. 대상 프로젝트 (초기 2개)
| ID | 이름 | repo(로컬 폴더) |
|---|---|---|
| `nexys-blockly` | Nexys Blockly Studio | `/Users/haku/Haku/nexys-blockly-studio` |
| `flight-sim2` | Flight Sim2 | `/Users/haku/Projects/flight-sim2` |

> 두 폴더는 각각 GitHub repo로 푸쉬되어 있어야 한다(public 또는 private). private이면 read 권한 PAT 필요.

## 4. 기능 요구사항 (Functional Requirements)

### FR-1 프로젝트 카드 (필수)
각 프로젝트를 카드로 표시:
- 프로젝트명 + 한 줄 요약(Log.md `summary`)
- **단계 배지**: 기획 / PoC / MVP / 베타 / 배포
- **진행률 바**: 0~100% (Log.md `progress`)
- 마지막 업데이트 시각("3시간 전")
- **Stale 경고**: 마지막 커밋이 7일 이상 지나면 빨간 점/배지

### FR-2 다이렉트 링크 (필수)
카드마다 클릭 즉시 이동하는 링크:
- `repo` → GitHub 저장소
- `데모` → GitHub Pages/배포 URL (있으면)
- `Log.md` → repo의 Log.md 파일 뷰
- `최신 커밋` → 최근 커밋 페이지

### FR-3 Log 개요 타임라인 (필수)
Log.md의 날짜 섹션(`## 2026-06-22`)을 최신 N개(기본 5개) 카드 안에 접이식으로 표시.
각 날짜 아래 bullet 항목 그대로.

### FR-4 마일스톤 체크리스트 (필수)
Log.md `## 마일스톤` 섹션의 `- [x] / - [ ]`를 파싱해 진척도(완료/전체) + 목록 표시.

### FR-5 최근 커밋 피드 (필수)
GitHub API로 최근 8개 커밋: 메시지(첫 줄)·작성자·상대시각, 클릭 시 커밋 URL 이동.

### FR-6 피드백 (필수)
프로젝트별 피드백 스레드:
- 입력: 작성자명(선택, 기본 "익명") + 본문 + 섹션 태그(general/UI/기능/버그)
- 표시: 최신순 목록, 작성자/시각/상태
- **상태 토글**: open → done → wontfix (누구나 변경 가능, 내부 도구 전제)
- **실시간**: 다른 사람이 남기면 새로고침 없이 즉시 목록에 추가(Supabase Realtime 구독)

### FR-7 자동 갱신 (필수)
- 프로젝트 repo push → `repository_dispatch` → 대시보드 `build.yml` 트리거 → `data.json` 재생성 → Pages 재배포
- cron `*/15` 백업(디스패치 누락 대비)
- 브라우저는 `data.json`을 60초마다 폴링, 변경 시 카드 재렌더(전체 새로고침 없이)

### FR-8 전체 상단 요약 (권장)
헤더에: 전체 프로젝트 수, 평균 진행률, "마지막 갱신 시각", open 피드백 총 개수.

## 5. 비기능 요구사항 (Non-Functional)
- **보안**: PAT는 Actions secret only. 클라이언트엔 Supabase anon key만(RLS 적용). 내부 도구이므로 익명 쓰기 허용하되, README에 "민감 정보 적지 말 것" 명시.
- **성능**: 첫 렌더 < 1.5s. data.json은 같은 오리진(레이트리밋 무관).
- **반응형**: 모바일 1열, 데스크탑 2열.
- **장애 격리**: Supabase 다운 시 카드/커밋/Log는 정상, 피드백만 "일시적으로 사용 불가" 표시.
- **비용**: GitHub Pages/Actions 무료 한도 내, Supabase 무료 티어.

## 6. 범위 밖 (Out of Scope, v1)
- 인증/로그인(내부 공유 전제, 필요 시 URL에 토큰 또는 추후 OAuth)
- 프로젝트 자동 등록(수동으로 `config.json`에 추가)
- 차트/번다운(텍스트 진행률로 대체)
- 3개 이상 프로젝트(추가는 config만 늘리면 자동 지원되도록 설계)

## 7. 인수 기준 (Acceptance Criteria)
1. 두 repo에 Log.template.md 형식으로 Log.md를 두고 푸쉬하면, 2분 내 대시보드에 반영된다.
2. 비개발 팀원이 GitHub 로그인 없이 피드백을 남길 수 있고, 내 다른 탭에서 즉시 보인다.
3. 단계/진행률/마일스톤이 Log.md만 수정해도 바뀐다(코드 수정 불필요).
4. 모든 링크가 정확한 GitHub URL로 연결된다.
5. `config.json`에 세 번째 프로젝트를 추가하면 카드가 자동으로 하나 더 생긴다.
