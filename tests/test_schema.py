#!/usr/bin/env python3
"""
test_schema.py — build_data.py 출력 스키마가 DESIGN.md §3 와 1:1 일치하는지 대조.
네트워크(fetch_log_md / fetch_commits)는 가짜로 대체해 결정적으로 검증한다.

실행: .venv/bin/python tests/test_schema.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import build_data as bd

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


# DESIGN.md §3 의 프로젝트 객체 키 (정확한 집합)
PROJECT_KEYS = {
    "id", "name", "stage", "progress", "summary",
    "repo_url", "demo_url", "log_url",
    "milestones", "milestone_done", "milestone_total",
    "entries", "commits", "last_commit_date", "days_since_commit", "error",
}
TOP_KEYS = {"generated_at", "owner", "projects"}  # DESIGN.md §3 최소 키
COMMIT_KEYS = {"sha", "message", "author", "date", "url"}

TEMPLATE = (ROOT / "reference" / "Log.template.md").read_text(encoding="utf-8")

FAKE_COMMITS = [
    {"sha": "a1b2c3d", "message": "feat: pinmap schema", "author": "haku",
     "date": "2026-06-22T08:40:00Z", "url": "https://github.com/OWNER/r/commit/a1b2c3d"},
]

print("== build_project: 정상 경로 ==")
bd.fetch_log_md = lambda repo, log_path: TEMPLATE
bd.fetch_commits = lambda repo: list(FAKE_COMMITS)
proj = bd.build_project({"id": "nexys-blockly", "repo": "nexys-blockly-studio", "log_path": "Log.md"})

check("프로젝트 키 집합이 DESIGN.md §3 와 정확히 일치",
      set(proj.keys()) == PROJECT_KEYS)
check("name = frontmatter project", proj["name"] == "Nexys Blockly Studio")
check("stage/progress 반영", proj["stage"] == "MVP" and proj["progress"] == 45)
check("progress 는 int", isinstance(proj["progress"], int))
check("repo_url 은 frontmatter 우선", proj["repo_url"] == "https://github.com/OWNER/nexys-blockly-studio")
check("log_url 구성", proj["log_url"].endswith("/blob/main/Log.md"))
check("milestone_total=5, done=2", proj["milestone_total"] == 5 and proj["milestone_done"] == 2)
check("entries 최신순", proj["entries"][0]["date"] == "2026-06-22")
check("commits 키 집합", all(set(c.keys()) == COMMIT_KEYS for c in proj["commits"]))
check("last_commit_date = 첫 커밋 date", proj["last_commit_date"] == "2026-06-22T08:40:00Z")
check("days_since_commit 은 int 또는 None",
      proj["days_since_commit"] is None or isinstance(proj["days_since_commit"], int))
check("error 는 None", proj["error"] is None)

print("== build_project: Log.md 없음 (404) ==")
bd.fetch_log_md = lambda repo, log_path: None
bd.fetch_commits = lambda repo: []
p_err = bd.build_project({"id": "x", "repo": "x", "log_path": "Log.md"})
check("키 집합 동일 (에러여도 스키마 유지)", set(p_err.keys()) == PROJECT_KEYS)
check("error 메시지 채워짐", bool(p_err["error"]))
check("stage 기본값 '기획'", p_err["stage"] == "기획")
check("progress 기본값 0", p_err["progress"] == 0)
check("커밋 0개 → []", p_err["commits"] == [])
check("last_commit_date None", p_err["last_commit_date"] is None)

print("== main() 산출 최상위 스키마 ==")
import json
bd.fetch_log_md = lambda repo, log_path: TEMPLATE
bd.fetch_commits = lambda repo: list(FAKE_COMMITS)
bd.main()
out = json.loads(bd.OUT.read_text(encoding="utf-8"))
check("최상위 키가 DESIGN.md §3 포함", TOP_KEYS.issubset(set(out.keys())))
check("owner 존재", "owner" in out and isinstance(out["owner"], str))
check("projects 가 config 길이와 일치", len(out["projects"]) == len(bd.CONFIG["projects"]))
check("generated_at ISO 형식", "T" in out["generated_at"])
# 생성물 정리 (gitignore 대상이지만 테스트 잔여물 제거)
try:
    bd.OUT.unlink()
except FileNotFoundError:
    pass

print(f"\n결과: {PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
