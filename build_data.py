#!/usr/bin/env python3
"""
build_data.py — 각 프로젝트 repo의 Log.md + 커밋을 모아 public/data.json 생성.
GitHub Actions에서 실행. 로컬 테스트도 가능: GH_PAT 환경변수만 있으면 됨.

의존성: requests, pyyaml  (pip install requests pyyaml)
환경변수: GH_PAT (repo contents read 권한 fine-grained PAT 또는 classic repo scope)
"""
import os
import re
import json
import base64
import datetime as dt
from pathlib import Path

import requests
import yaml

ROOT = Path(__file__).parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUT = ROOT / "public" / "data.json"

GH_PAT = os.environ.get("GH_PAT", "")
API = "https://api.github.com"
HEADERS = {"Accept": "application/vnd.github+json"}
if GH_PAT:
    HEADERS["Authorization"] = f"Bearer {GH_PAT}"

OWNER = CONFIG["github_owner"]
BRANCH = CONFIG.get("log_branch", "main")
MAX_ENTRIES = CONFIG.get("max_entries", 5)
MAX_COMMITS = CONFIG.get("max_commits", 8)
STALE_DAYS = CONFIG.get("stale_days", 7)


def gh_get(url, params=None):
    r = requests.get(url, headers=HEADERS, params=params, timeout=20)
    r.raise_for_status()
    return r.json()


def fetch_log_md(repo, log_path):
    """repo의 Log.md 원문 반환. 없으면 None."""
    url = f"{API}/repos/{OWNER}/{repo}/contents/{log_path}"
    try:
        data = gh_get(url, params={"ref": BRANCH})
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return None
        raise
    if data.get("encoding") == "base64":
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    return data.get("content", "")


def parse_frontmatter(text):
    """첫 --- ~ 두번째 --- 사이를 YAML로 파싱."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return {}, text
    fm = yaml.safe_load(m.group(1)) or {}
    body = text[m.end():]
    return fm, body


def parse_milestones(body):
    """## 마일스톤 섹션의 - [x] / - [ ] 추출."""
    sec = re.search(r"##\s*마일스톤\s*\n(.*?)(?=\n##\s|\Z)", body, re.DOTALL)
    if not sec:
        return []
    out = []
    for line in sec.group(1).splitlines():
        m = re.match(r"\s*-\s*\[([ xX])\]\s*(.+)", line)
        if m:
            out.append({"text": m.group(2).strip(), "done": m.group(1).lower() == "x"})
    return out


def parse_entries(body):
    """## YYYY-MM-DD 섹션들 → 날짜별 bullet 목록. 최신순."""
    entries = []
    for m in re.finditer(r"##\s*(\d{4}-\d{2}-\d{2})\s*\n(.*?)(?=\n##\s|\Z)", body, re.DOTALL):
        date = m.group(1)
        items = [
            re.sub(r"^\s*-\s*", "", ln).strip()
            for ln in m.group(2).splitlines()
            if ln.strip().startswith("-")
        ]
        if items:
            entries.append({"date": date, "items": items})
    entries.sort(key=lambda e: e["date"], reverse=True)
    return entries[:MAX_ENTRIES]


def fetch_commits(repo):
    url = f"{API}/repos/{OWNER}/{repo}/commits"
    try:
        raw = gh_get(url, params={"sha": BRANCH, "per_page": MAX_COMMITS})
    except requests.HTTPError:
        return []
    out = []
    for c in raw:
        commit = c.get("commit", {})
        author = commit.get("author", {})
        out.append({
            "sha": c.get("sha", "")[:7],
            "message": (commit.get("message", "").splitlines() or [""])[0][:100],
            "author": author.get("name", "?"),
            "date": author.get("date", ""),
            "url": c.get("html_url", ""),
        })
    return out


def days_since(iso):
    if not iso:
        return None
    try:
        d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (dt.datetime.now(dt.timezone.utc) - d).days
    except Exception:
        return None


def build_project(p):
    repo = p["repo"]
    base = f"https://github.com/{OWNER}/{repo}"
    proj = {
        "id": p["id"], "name": p["id"], "stage": "기획", "progress": 0,
        "summary": "", "repo_url": base, "demo_url": "",
        "log_url": f"{base}/blob/{BRANCH}/{p['log_path']}",
        "milestones": [], "milestone_done": 0, "milestone_total": 0,
        "entries": [], "commits": [], "last_commit_date": None,
        "days_since_commit": None, "error": None,
    }
    try:
        text = fetch_log_md(repo, p["log_path"])
        if text is None:
            proj["error"] = "Log.md를 찾을 수 없습니다."
        else:
            fm, body = parse_frontmatter(text)
            proj["name"] = fm.get("project", p["id"])
            proj["stage"] = fm.get("stage", "기획")
            proj["progress"] = int(fm.get("progress", 0) or 0)
            proj["summary"] = fm.get("summary", "")
            proj["demo_url"] = fm.get("demo_url", "") or ""
            if fm.get("repo_url"):
                proj["repo_url"] = fm["repo_url"]
            ms = parse_milestones(body)
            proj["milestones"] = ms
            proj["milestone_total"] = len(ms)
            proj["milestone_done"] = sum(1 for m in ms if m["done"])
            proj["entries"] = parse_entries(body)

        commits = fetch_commits(repo)
        proj["commits"] = commits
        if commits:
            proj["last_commit_date"] = commits[0]["date"]
            proj["days_since_commit"] = days_since(commits[0]["date"])
    except Exception as e:  # 네트워크/권한 등
        proj["error"] = f"{type(e).__name__}: {e}"
    return proj


def main():
    projects = [build_project(p) for p in CONFIG["projects"]]
    out = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "owner": OWNER,
        "stale_days": STALE_DAYS,
        "projects": projects,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} ({len(projects)} projects)")


if __name__ == "__main__":
    main()
