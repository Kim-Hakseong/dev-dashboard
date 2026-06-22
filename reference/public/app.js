// public/app.js — 대시보드 메인 로직 (Vanilla ES Module)
import { createSupabaseAdapter } from "./feedback-supabase.js";

const CFG = window.DASHBOARD_CONFIG || {};
const feedback = createSupabaseAdapter(CFG);

const ACCENT = { "nexys-blockly": "#E60012", "flight-sim2": "#2f81f7" };
const STAGE_COLOR = {
  "기획": "#8b949e", "PoC": "#a371f7", "MVP": "#39c5cf",
  "베타": "#db6d28", "배포": "#3fb950",
};
const SECTIONS = ["general", "UI", "기능", "버그"];

let lastDataHash = "";
let fbCache = {}; // projectId -> rows[]

// ---------- 유틸 ----------
const $ = (sel, el = document) => el.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
function relativeTime(iso) {
  if (!iso) return "";
  const diff = (new Date(iso) - new Date()) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400],
                 ["hour", 3600], ["minute", 60]];
  for (const [unit, sec] of units) {
    if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
  }
  return "방금 전";
}

// ---------- 데이터 로드 ----------
async function loadData() {
  try {
    const res = await fetch("./data.json?t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const hash = JSON.stringify(data).length + ":" + data.generated_at;
    if (hash === lastDataHash) return;
    lastDataHash = hash;
    await renderAll(data);
  } catch (e) {
    $("#status").textContent = "데이터 로드 실패 — 잠시 후 자동 재시도";
  }
}

async function renderAll(data) {
  // 피드백 선조회 (프로젝트별)
  if (feedback.available) {
    await Promise.all(data.projects.map(async (p) => {
      try { fbCache[p.id] = await feedback.list(p.id); }
      catch { fbCache[p.id] = []; }
    }));
  }
  renderHeader(data);
  const grid = $("#grid");
  grid.innerHTML = "";
  data.projects.forEach((p) => grid.appendChild(renderCard(p, data.stale_days)));
}

function renderHeader(data) {
  const ps = data.projects;
  const avg = ps.length ? Math.round(ps.reduce((s, p) => s + (p.progress || 0), 0) / ps.length) : 0;
  const openCount = Object.values(fbCache).flat().filter((f) => f.status === "open").length;
  $("#meta").innerHTML =
    `프로젝트 <b>${ps.length}</b> · 평균 진행률 <b>${avg}%</b> · ` +
    `open 피드백 <b>${openCount}</b>건`;
  $("#status").textContent = "마지막 갱신 " + relativeTime(data.generated_at);
}

// ---------- 카드 ----------
function renderCard(p, staleDays) {
  const accent = ACCENT[p.id] || "#58a6ff";
  const card = el("div", "card");
  card.style.setProperty("--accent", accent);

  const stale = p.days_since_commit != null && p.days_since_commit >= (staleDays || 7);

  // 헤더
  const head = el("div", "card-head");
  head.innerHTML = `
    <div class="title-row">
      <span class="dot" style="background:${accent}"></span>
      <h2>${esc(p.name)}</h2>
      <span class="badge" style="background:${STAGE_COLOR[p.stage] || "#8b949e"}">${esc(p.stage)}</span>
      ${stale ? `<span class="stale">● ${p.days_since_commit}일 전 커밋</span>` : ""}
    </div>
    <div class="links">
      <a href="${esc(p.repo_url)}" target="_blank">repo ↗</a>
      ${p.demo_url ? `<a href="${esc(p.demo_url)}" target="_blank">데모 ↗</a>` : ""}
      <a href="${esc(p.log_url)}" target="_blank">Log.md ↗</a>
      ${p.commits?.[0] ? `<a href="${esc(p.commits[0].url)}" target="_blank">최신 커밋 ↗</a>` : ""}
    </div>`;
  card.appendChild(head);

  if (p.error) {
    card.appendChild(el("div", "err", `⚠ ${esc(p.error)}`));
  }
  if (p.summary) card.appendChild(el("p", "summary", esc(p.summary)));

  // 진행률 + 마일스톤
  const prog = el("div", "prog");
  prog.innerHTML = `
    <div class="bar"><span style="width:${p.progress || 0}%;background:${accent}"></span></div>
    <div class="prog-meta">
      <span>진행률 ${p.progress || 0}%</span>
      ${p.milestone_total ? `<span>마일스톤 ${p.milestone_done}/${p.milestone_total}</span>` : ""}
    </div>`;
  card.appendChild(prog);

  if (p.milestones?.length) card.appendChild(milestones(p.milestones));
  card.appendChild(collapsible("최근 로그", timeline(p.entries)));
  card.appendChild(collapsible("최근 커밋", commits(p.commits)));
  card.appendChild(feedbackBlock(p.id));
  return card;
}

function milestones(ms) {
  const box = el("div", "milestones");
  ms.forEach((m) => box.appendChild(el("div", "ms" + (m.done ? " done" : ""),
    `${m.done ? "☑" : "☐"} ${esc(m.text)}`)));
  return box;
}

function timeline(entries) {
  const box = el("div", "timeline");
  if (!entries?.length) { box.textContent = "로그 없음"; return box; }
  entries.forEach((e) => {
    const blk = el("div", "tl-entry");
    blk.appendChild(el("div", "tl-date", esc(e.date)));
    const ul = el("ul");
    e.items.forEach((it) => ul.appendChild(el("li", null, esc(it))));
    blk.appendChild(ul);
    box.appendChild(blk);
  });
  return box;
}

function commits(cs) {
  const box = el("div", "commits");
  if (!cs?.length) { box.textContent = "커밋 없음"; return box; }
  cs.forEach((c) => {
    const row = el("a", "commit");
    row.href = c.url; row.target = "_blank";
    row.innerHTML = `<code>${esc(c.sha)}</code><span class="cmsg">${esc(c.message)}</span>` +
      `<span class="cmeta">${esc(c.author)} · ${relativeTime(c.date)}</span>`;
    box.appendChild(row);
  });
  return box;
}

function collapsible(label, content) {
  const det = el("details", "collapsible");
  det.open = label === "최근 로그";
  const sum = el("summary", null, label);
  det.appendChild(sum);
  det.appendChild(content);
  return det;
}

// ---------- 피드백 ----------
function feedbackBlock(projectId) {
  const box = el("div", "feedback");
  box.dataset.project = projectId;
  box.appendChild(el("div", "fb-label", "피드백"));

  if (!feedback.available) {
    box.appendChild(el("div", "fb-warn", esc(feedback.reason || "피드백 백엔드 미연결")));
    return box;
  }

  // 입력 폼 (HTML <form> 금지 → div + 버튼)
  const form = el("div", "fb-form");
  const author = el("input", "fb-author"); author.placeholder = "이름(선택)";
  const sect = el("select", "fb-section");
  SECTIONS.forEach((s) => { const o = el("option", null, s); o.value = s; sect.appendChild(o); });
  const body = el("input", "fb-body"); body.placeholder = "피드백을 남겨주세요…";
  const btn = el("button", "fb-submit", "남기기");
  btn.onclick = async () => {
    const text = body.value.trim();
    if (!text) return;
    btn.disabled = true;
    try {
      await feedback.add({ project_id: projectId, section: sect.value,
                           author: author.value.trim(), body: text });
      body.value = "";
    } catch (e) { alert("등록 실패: " + e.message); }
    finally { btn.disabled = false; }
  };
  body.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
  form.append(author, sect, body, btn);
  box.appendChild(form);

  const list = el("div", "fb-list");
  box.appendChild(list);
  renderFeedbackList(list, projectId);
  return box;
}

function renderFeedbackList(listEl, projectId) {
  const rows = fbCache[projectId] || [];
  listEl.innerHTML = "";
  if (!rows.length) { listEl.appendChild(el("div", "fb-empty", "아직 피드백이 없습니다.")); return; }
  rows.forEach((f) => {
    const item = el("div", "fb-item status-" + f.status);
    item.dataset.id = f.id;
    item.innerHTML = `
      <div class="fb-meta">
        <b>${esc(f.author)}</b> · ${esc(f.section)} · ${relativeTime(f.created_at)}
      </div>
      <div class="fb-text">${esc(f.body)}</div>`;
    const status = el("button", "fb-status", statusLabel(f.status));
    status.onclick = async () => {
      const next = { open: "done", done: "wontfix", wontfix: "open" }[f.status];
      try { await feedback.setStatus(f.id, next); } catch (e) { alert(e.message); }
    };
    item.appendChild(status);
    listEl.appendChild(item);
  });
}

const statusLabel = (s) => ({ open: "🟢 open", done: "✅ done", wontfix: "⚪ wontfix" }[s] || s);

// 실시간 변경 반영
function wireRealtime() {
  if (!feedback.available) return;
  feedback.subscribe((evt, row) => {
    if (!row) return;
    const pid = row.project_id;
    const arr = fbCache[pid] || [];
    if (evt === "INSERT") fbCache[pid] = [row, ...arr.filter((r) => r.id !== row.id)];
    else if (evt === "UPDATE") fbCache[pid] = arr.map((r) => (r.id === row.id ? row : r));
    else if (evt === "DELETE") fbCache[pid] = arr.filter((r) => r.id !== row.id);
    const box = document.querySelector(`.feedback[data-project="${pid}"] .fb-list`);
    if (box) renderFeedbackList(box, pid);
    // 헤더 open 카운트 갱신용 가벼운 재계산
    const openCount = Object.values(fbCache).flat().filter((f) => f.status === "open").length;
    const meta = document.querySelector("#meta b:last-child");
    if (meta) meta.textContent = openCount;
  });
}

// ---------- 부트 ----------
async function init() {
  await loadData();
  wireRealtime();
  setInterval(loadData, CFG.pollMs || 60000);
}
init();
