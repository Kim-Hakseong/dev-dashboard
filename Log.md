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
