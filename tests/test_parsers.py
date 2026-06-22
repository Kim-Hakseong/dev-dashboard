#!/usr/bin/env python3
"""
test_parsers.py — build_data.py 파싱 함수 단위 검증.
reference/Log.template.md 를 입력으로 frontmatter / 마일스톤 / 날짜 엔트리가
DESIGN.md 스키마대로 나오는지 확인한다.

실행:
    .venv/bin/python tests/test_parsers.py
(의존성: requests, pyyaml — build_data import 시 필요)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import build_data as bd

TEMPLATE = (ROOT / "reference" / "Log.template.md").read_text(encoding="utf-8")

PASS = 0
FAIL = 0


def check(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name}")


print("== parse_frontmatter ==")
fm, body = bd.parse_frontmatter(TEMPLATE)
check("project = 'Nexys Blockly Studio'", fm.get("project") == "Nexys Blockly Studio")
check("stage = 'MVP'", fm.get("stage") == "MVP")
check("progress = 45 (int)", fm.get("progress") == 45)
check("repo_url 존재", fm.get("repo_url", "").startswith("https://github.com/"))
check("demo_url 존재", fm.get("demo_url", "").startswith("https://"))
check("summary 비어있지 않음", bool(fm.get("summary")))
check("body 에서 frontmatter 제거됨", "## 마일스톤" in body and "project:" not in body.split("\n")[0])

print("== parse_milestones ==")
ms = bd.parse_milestones(body)
check("마일스톤 5개", len(ms) == 5)
check("완료 2개", sum(1 for m in ms if m["done"]) == 2)
check("각 항목 {text, done} 키", all(set(m.keys()) == {"text", "done"} for m in ms))
check("첫 항목 done=True 'Blockly 코어 통합'",
      ms[0] == {"text": "Blockly 코어 통합", "done": True})
check("미완료 항목 done=False", ms[2]["done"] is False)

print("== parse_entries ==")
entries = bd.parse_entries(body)
check("엔트리 2개", len(entries) == 2)
check("최신순 정렬 (2026-06-22 먼저)", entries[0]["date"] == "2026-06-22")
check("2026-06-22 항목 2개", entries[0]["items"] == ["블록 카테고리 12종 정의", "DAQ 핀맵 JSON 스키마 확정"])
check("2026-06-21 항목 2개", len(entries[1]["items"]) == 2)
check("각 엔트리 {date, items} 키", all(set(e.keys()) == {"date", "items"} for e in entries))
check("items 에 '- ' 접두사 제거됨", all(not it.startswith("-") for e in entries for it in e["items"]))

print("== max_entries 상한 ==")
# 합성: 7개의 날짜 섹션 → 상위 MAX_ENTRIES(5)개만
many = "## 마일스톤\n- [ ] x\n" + "".join(
    f"## 2026-06-{d:02d}\n- item {d}\n" for d in range(10, 17))
e2 = bd.parse_entries(many)
check(f"엔트리 {bd.MAX_ENTRIES}개로 절단", len(e2) == bd.MAX_ENTRIES)
check("절단 후에도 최신순", e2[0]["date"] == "2026-06-16")

print("== 엣지케이스: frontmatter 없음 ==")
fm0, body0 = bd.parse_frontmatter("## 마일스톤\n- [x] a\n")
check("frontmatter 없으면 빈 dict", fm0 == {})
check("본문은 그대로 반환", body0.startswith("## 마일스톤"))

print("== 엣지케이스: 마일스톤/엔트리 없음 ==")
check("마일스톤 섹션 없으면 []", bd.parse_milestones("## 2026-06-22\n- a\n") == [])
check("날짜 섹션 없으면 []", bd.parse_entries("## 마일스톤\n- [ ] a\n") == [])

print(f"\n결과: {PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
