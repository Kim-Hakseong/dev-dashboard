# Log.md — 빌드 로그 (append-only)

이 파일은 대시보드 자체의 빌드 연속성 기록이다.
(대시보드가 추적하는 프로젝트들의 Log.md와는 별개. 그쪽은 reference/Log.template.md 포맷을 쓴다.)

## 2026-06-22
- 하네스 초기화: CLAUDE.md / PRD.md / DESIGN.md / PROMPT_ralph.md 작성
- reference 기준 구현 제공: build_data.py, build.yml, notify-dashboard.yml, supabase_schema.sql,
  public/{index.html, app.js, config.js, feedback-adapter.js, feedback-supabase.js}, Log.template.md
- 아키텍처 확정: GitHub Pages(정적) + GitHub Actions(데이터/배포) + repository_dispatch(자동감지) + Supabase(실시간 피드백)
- 피드백 레이어를 포트-어댑터로 분리(나중에 Giscus 교체 가능)
- 구조 배치: reference/ → 목표 구조(config.json, build_data.py, supabase_schema.sql, .github/workflows/build.yml, public/*, _for-project-repos/notify-dashboard.yml). data.json은 생성물이라 gitignore로 제외
- 파서 검증: tests/test_parsers.py 작성 → Log.template.md frontmatter/마일스톤/엔트리 파싱 24개 단언 통과
- 스키마 검증: tests/test_schema.py 작성 → build_data.py 출력 키가 DESIGN.md §3과 1:1 일치 + Log.md 누락 폴백까지 22개 통과
- 장애 격리 개선: feedback-supabase.js를 동적 import 폴백으로 전환(esm.sh 실패 시 피드백 영역만 비활성, 카드/커밋/로그는 정상). app.js는 async 어댑터를 init()에서 await
- 엣지케이스 확인: Log.md 없음/frontmatter 누락/커밋0/마일스톤0/Supabase 미설정 폴백 코드로 보장
- 로컬 검증: build_data.py 실행 → data.json 생성, 정적 서버 6개 자산 200 OK, JS 4개 node --check 통과, 시크릿 누출 0건
- README 갱신: 실제 파일 구조·OWNER 치환 위치·venv 로컬 테스트·단위 검증 커맨드 반영
- 배포: owner=Kim-Hakseong public repo 생성/push, GitHub Pages(Actions) 활성화 → https://kim-hakseong.github.io/dev-dashboard/ 라이브
- 프로젝트 Log.md SSOT 블록 추가: nexys/flight-sim2 각 Log.md 상단에 frontmatter+마일스톤+날짜 섹션 prepend(원본 보존) → 카드 실데이터 채움
- nexys 데모 URL을 Vercel(nexys-blockly-studio.vercel.app)로, flight-sim2는 GitHub Pages로 연결
- UI 노션 스타일 리디자인: 라이트 테마, 픽토그램/이모지, 개요 콜아웃, SVG 진행률 도넛 링, 5단계 파이프라인 스테퍼, 마일스톤 체크리스트, 토글, 통계 스트립. Chrome 헤드리스로 데스크탑/모바일 렌더 검증. DESIGN.md §6 갱신
- 피드백 백엔드를 Giscus(GitHub Discussions)로 전환: config.js feedbackBackend 스위치(giscus|supabase), 프로젝트별 토론 스레드(data-term) 임베드, dev-dashboard repo Discussions 활성화 + repoId/categoryId 연결. Supabase 어댑터 경로는 보존
- 피드백을 Discussions 링크 방식으로 전환(설치/키 0): 프로젝트별 토론 스레드(#1 nexys, #2 flight-sim2) API로 생성, 카드에 "피드백 남기러 가기" CTA 버튼. config.js feedbackBackend "discussions" 기본값, giscus/supabase 경로는 스위치로 보존
- 피드백 방식 확정: **GitHub Discussions 링크 유지**(GitHub 로그인 후 댓글 작성). 익명 입력이 필요해지면 Supabase, 인라인 임베드가 필요해지면 Giscus로 `config.js`의 `feedbackBackend` 한 줄만 바꾸면 전환됨

### 현재 상태 스냅샷 (2026-06-22 기준)
- **라이브 대시보드**: https://kim-hakseong.github.io/dev-dashboard/ (GitHub Pages, Actions 배포)
- **데이터 파이프라인**: 각 프로젝트 repo의 `Log.md`(frontmatter+마일스톤+날짜) + 커밋 → `build_data.py` → `public/data.json`. 자동 갱신은 cron `*/15` 백업(프로젝트 repo에 notify 워크플로 미설치 상태). 브라우저는 60초 폴링.
- **추적 프로젝트**: ① Nexys Blockly Studio — 베타·진행률 70%, 데모 https://nexys-blockly-studio.vercel.app/ ② Flight Sim2 — 베타·진행률 85%, 데모 https://kim-hakseong.github.io/flight-sim2/
- **UI**: 노션 라이트 스타일(픽토그램·개요 콜아웃·진행률 도넛 링·5단계 파이프라인 스테퍼·마일스톤 체크리스트·통계 스트립), 모바일 1열/데스크탑 2열 반응형
- **피드백**: GitHub Discussions 링크(스레드 #1/#2 생성됨), 카드별 CTA 버튼
- **검증**: 파서 24/24 · 스키마 22/22 통과, 시크릿 누출 0건(클라이언트엔 공개 안전값만)
- **남은 선택 작업**: ① 프로젝트 push 즉시 반영 원하면 `_for-project-repos/notify-dashboard.yml` 설치 + `DASHBOARD_DISPATCH_TOKEN` 등록 ② 익명 피드백 원하면 Supabase 연결

## 2026-06-24
- 좌측 상단 NEXYS 브랜드 로고 추가: etc/image001.png → public/logo.png, 페이지 상단 브랜드 바(.topbar)에 좌측 정렬 배치
- 로고 위치 재조정: 상단 바(.topbar)가 커버·제목·아이콘을 아래로 밀던 문제 수정 → 제목/🛠️ 아이콘을 원위치 복원하고, 로고를 page-head 안 head-top 행의 우측에 배치(아이콘과 같은 높이 정렬)
- 커버 배너 위치 조정: 페이지 상단 여백(22px) 추가 + 전체 모서리 라운드 + 콘텐츠 폭에 맞춤(풀블리드 제거) → 배너가 화면 맨 위에 붙어 보이던 문제 해소
- 헤더를 hero 카드로 재구성: 둥근 사각형 안에 [🛠️ 아이콘+NEXYS 로고 행] + 제목 + 설명을 모두 포함(이전엔 빈 커버 아래에 분리돼 있었음)
- 즉시 동기화(2026-06-25): 진단 결과 연동 정상이나 cron 지연(실제 1.5~3h)으로 최신 커밋 반영 지연. 수동 재빌드로 즉시 따라잡음. 항구 해결로 notify-dashboard.yml(토큰 미설정 시 스킵하도록 보강)을 nexys/flight-sim2 두 repo의 .github/workflows에 설치 → push 시 repository_dispatch로 대시보드 즉시 재빌드. 남은 건 DASHBOARD_DISPATCH_TOKEN(PAT) 등록뿐
- 즉시 동기화 검증 완료(2026-06-25): DASHBOARD_DISPATCH_TOKEN 등록 후 두 프로젝트 notify 워크플로 재실행 → 각각 dev-dashboard에 repository_dispatch 빌드 자동 트리거 + 배포 success 확인. 이제 nexys/flight-sim2 push 시 ~30초~1분 내 대시보드 자동 갱신(cron */15는 백업으로 유지)
- flight-sim2 개요 누락 수정(2026-06-25): 어제 "GCS-first reset" 커밋이 Log.md를 통째로 재작성하며 frontmatter 유실 → summary='' 기획 0%로 표시됨. 새 방향(MAVLink GCS 루프)에 맞춰 frontmatter+마일스톤(M0~M3 done/M4 예정)+날짜 재추가. push가 즉시 동기화(notify→dispatch)를 실제로 트리거해 대시보드 자동 갱신 확인 → Flight Sim2 = MVP 55%, 개요 표시됨
