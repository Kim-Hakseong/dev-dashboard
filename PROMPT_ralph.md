# PROMPT_ralph.md — 자율 빌드 루프 프롬프트

> 새 Claude Code 세션을 열고 이 하네스 ZIP을 푼 폴더에서 아래 전체를 그대로 붙여넣어 실행한다.

---

너는 이 폴더의 빌드 담당이다. `CLAUDE.md`(헌법), `PRD.md`(요구사항), `DESIGN.md`(설계)를 먼저 정독하라. 그다음 아래 루프를 따라 **개발 진행 대시보드**를 완성하라.

## 컨텍스트
- `reference/` 폴더에 동작하는 기준 구현이 들어 있다. 이걸 목표 구조로 배치하고 다듬는 것이 1차 목표다.
- 절대 규칙은 CLAUDE.md §1을 따른다. 특히: 빌드 스텝 없음, Vanilla JS, 완성 파일만, 비밀값 하드코딩 금지.

## 루프 (각 단계 끝에 Log.md에 1줄 기록)
1. **구조 배치**: 아래 목표 구조로 `reference/` 파일들을 옮긴다.
   ```
   ./config.json
   ./build_data.py
   ./supabase_schema.sql
   ./.github/workflows/build.yml
   ./public/{index.html, app.js, config.js, feedback-adapter.js, feedback-supabase.js}
   ./.gitignore   (public/data.json 포함)
   ```
   그리고 프로젝트 repo용 `notify-dashboard.yml`은 `./_for-project-repos/notify-dashboard.yml`에 보관(설명용).
2. **검증 1 — 파서**: `reference/Log.template.md`를 임시 입력으로 `build_data.py`의 파싱 함수
   (`parse_frontmatter`, `parse_milestones`, `parse_entries`)가 정확히 동작하는지 작은 단위 테스트를 짜서 확인하라.
   frontmatter/마일스톤/날짜 엔트리가 스키마대로 나와야 한다.
3. **검증 2 — data.json 스키마**: DESIGN.md §3 스키마와 `build_data.py` 출력 키가 1:1 일치하는지 대조하라.
   불일치 시 build_data.py를 수정한다(스키마가 진실).
4. **UI 다듬기**: DESIGN.md §6 디자인 시스템·§7 컴포넌트 분해에 맞춰 `index.html`/`app.js`를 점검·개선하라.
   - 모바일 1열/데스크탑 2열 반응형 확인
   - 단계 배지색·진행률 바·Stale 경고·상대시각 표기 확인
   - HTML `<form>` 태그 미사용 확인(버튼 onclick)
5. **엣지케이스**: Log.md 없음 / frontmatter 누락 / 커밋 0 / Supabase 미설정 폴백이 CLAUDE.md §4·DESIGN.md §8대로 동작하는지 코드로 보장하라.
6. **README 갱신**: 실제 파일 구조에 맞게 `README.md`의 수동 셋업 체크리스트를 최신화하라.
7. **완료 점검**: CLAUDE.md §4 Definition of Done 체크리스트를 모두 통과시켜라. 미달 항목이 있으면 1번으로 돌아가 반복.

## 출력 규칙
- 파일은 항상 통째로 작성(부분 diff 금지).
- 각 루프 종료 시 `Log.md`에 `## YYYY-MM-DD` 아래 `- 무엇을 했는지` 한 줄 append.
- 너가 임의로 PAT/anon key 값을 채우지 마라. placeholder(`OWNER`, `YOUR_PROJECT`)는 그대로 두고 README에 "사용자가 채울 곳"으로 안내.
- 마지막에 "남은 수동 작업"(GitHub repo 생성, secret 등록, Supabase SQL 실행)을 번호 목록으로 요약 출력.

## 하지 말 것
- 프레임워크/번들러 도입 금지.
- data.json을 직접 손으로 만들지 말 것(반드시 build_data.py 산출물).
- LangChain류 추상화 금지.
