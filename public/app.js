// public/app.js — 대시보드 메인 로직 (Vanilla ES Module, 노션 스타일)
import { createSupabaseAdapter } from "./feedback-supabase.js";
import { createNullAdapter } from "./feedback-adapter.js";

const CFG = window.DASHBOARD_CONFIG || {};
// 피드백 어댑터는 init()에서 비동기로 교체된다(동적 import 폴백을 위해).
// 그 전에 호출돼도 안전하도록 null 어댑터로 시작한다.
let feedback = createNullAdapter("피드백 초기화 중…");

// 프로젝트별 액센트(강조색 + 연한 배경). 미지정 프로젝트는 기본값.
const ACCENT = {
  "nexys-blockly": { accent: "#E60012", soft: "#fdecec", emoji: "🧩" },
  "flight-sim2":   { accent: "#2f81f7", soft: "#e9f1fe", emoji: "✈️" },
};
const ACCENT_FALLBACK = { accent: "#6940a5", soft: "#f4f0f8", emoji: "📦" };

// 단계: 파이프라인 순서 + 노션 select 색 + 픽토그램
const STAGES = [
  { key: "기획", emoji: "📝", bg: "#f1f0ee", fg: "#5f5e5b" },
  { key: "PoC",  emoji: "🔬", bg: "#f4f0f8", fg: "#6940a5" },
  { key: "MVP",  emoji: "🚀", bg: "#e7f3f8", fg: "#0b6e99" },
  { key: "베타", emoji: "🧪", bg: "#faebdd", fg: "#b25f1b" },
  { key: "배포", emoji: "✅", bg: "#edf3ec", fg: "#3e6e47" },
];
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
const accentFor = (id) => ACCENT[id] || ACCENT_FALLBACK;
const stageOf = (stage) => STAGES.find((s) => s.key === stage) || STAGES[0];

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

// SVG 진행률 링 (인포그래픽)
function progressRing(pct, color, size = 56) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - p / 100);
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#eceae5" stroke-width="6"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
      transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="50%" dy="0.34em" text-anchor="middle" class="ring-label">${p}%</text>
  </svg>`;
}

// 단계 파이프라인 (인포그래픽 + 픽토그램)
function stageStepper(stage) {
  const idx = STAGES.findIndex((s) => s.key === stage);
  const cur = idx < 0 ? 0 : idx;
  return `<div class="stepper">` + STAGES.map((s, i) => {
    const state = i < cur ? "done" : i === cur ? "current" : "todo";
    return `<div class="step ${state}"><span class="s-ic">${s.emoji}</span>` +
           `<span class="s-lb">${esc(s.key)}</span></div>`;
  }).join("") + `</div>`;
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
    $("#status").innerHTML = `⚠️ 데이터 로드 실패 — 잠시 후 자동 재시도`;
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
  renderStats(data);
  const grid = $("#grid");
  grid.innerHTML = "";
  data.projects.forEach((p) => grid.appendChild(renderCard(p, data.stale_days)));
  $("#status").innerHTML =
    `<span class="live-dot"></span> 마지막 갱신 ${esc(relativeTime(data.generated_at))}` +
    (feedback.available ? " · 피드백 실시간 연결됨" : "");
}

// ---------- 상단 통계 인포그래픽 ----------
function openFeedbackCount() {
  return Object.values(fbCache).flat().filter((f) => f.status === "open").length;
}
function renderStats(data) {
  const ps = data.projects;
  const avg = ps.length ? Math.round(ps.reduce((s, p) => s + (p.progress || 0), 0) / ps.length) : 0;
  const open = openFeedbackCount();
  $("#stats").innerHTML = `
    <div class="stat"><span class="ic">📁</span><div><div class="v">${ps.length}</div><div class="k">프로젝트</div></div></div>
    <div class="stat">${progressRing(avg, "#0b6e99", 48)}<div><div class="k">평균 진행률</div></div></div>
    <div class="stat"><span class="ic">🕐</span><div><div class="v" style="font-size:15px">${esc(relativeTime(data.generated_at) || "—")}</div><div class="k">마지막 갱신</div></div></div>
    <div class="stat"><span class="ic">💬</span><div><div class="v" id="stat-open">${open}</div><div class="k">open 피드백</div></div></div>`;
}
function refreshOpenStat() {
  const node = $("#stat-open");
  if (node) node.textContent = openFeedbackCount();
}

// ---------- 카드 ----------
function renderCard(p, staleDays) {
  const a = accentFor(p.id);
  const st = stageOf(p.stage);
  const card = el("div", "card");
  card.style.setProperty("--accent", a.accent);
  card.style.setProperty("--accent-soft", a.soft);

  const stale = p.days_since_commit != null && p.days_since_commit >= (staleDays || 7);
  const lastTxt = p.last_commit_date
    ? (stale
        ? `<span class="stale">⏳ ${p.days_since_commit}일째 커밋 없음</span>`
        : `<span class="fresh">🕐 최근 커밋 ${esc(relativeTime(p.last_commit_date))}</span>`)
    : `<span class="fresh">커밋 없음</span>`;

  // 헤더: 픽토그램 + 이름 + 단계 select 배지 + 신선도
  const head = el("div", "card-head");
  head.innerHTML = `
    <div class="proj-emoji">${a.emoji}</div>
    <div class="head-main">
      <div class="title-row">
        <h2>${esc(p.name)}</h2>
        <span class="select" style="background:${st.bg};color:${st.fg}">${st.emoji} ${esc(p.stage)}</span>
      </div>
      <div style="margin-top:4px">${lastTxt}</div>
    </div>`;
  card.appendChild(head);

  if (p.error) {
    card.appendChild(el("div", "err", `⚠️ ${esc(p.error)}`));
  }

  // 개요 콜아웃
  if (p.summary) {
    const co = el("div", "callout");
    co.innerHTML = `<span class="c-ic">💡</span>
      <div class="c-body"><span class="c-k">개요</span>${esc(p.summary)}</div>`;
    card.appendChild(co);
  }

  // 인포그래픽: 진행률 링 + 단계 파이프라인
  const info = el("div", "info-row");
  info.innerHTML = `
    <div class="ring-wrap">
      ${progressRing(p.progress, a.accent, 60)}
      <div class="ring-meta">
        <div class="rk">진행률</div>
        <div class="rv">${p.milestone_total ? `마일스톤 ${p.milestone_done}/${p.milestone_total}` : "진행 중"}</div>
      </div>
    </div>
    ${stageStepper(p.stage)}`;
  card.appendChild(info);

  // 마일스톤 체크리스트
  if (p.milestones?.length) {
    const wrap = el("div");
    const pct = p.milestone_total ? Math.round(p.milestone_done / p.milestone_total * 100) : 0;
    wrap.innerHTML = `<div class="section-label">🎯 마일스톤 ${p.milestone_done}/${p.milestone_total}</div>
      <div class="ms-bar"><span style="width:${pct}%"></span></div>`;
    wrap.appendChild(milestones(p.milestones));
    card.appendChild(wrap);
  }

  // 다이렉트 링크 (노션 북마크 버튼)
  card.appendChild(linkRow(p));

  // 토글: 최근 로그 / 최근 커밋
  card.appendChild(toggle("🗒️ 최근 로그", timeline(p.entries), true));
  card.appendChild(toggle("🔧 최근 커밋", commits(p.commits), false));

  // 피드백
  card.appendChild(feedbackBlock(p.id));
  return card;
}

function linkRow(p) {
  const box = el("div", "links");
  const add = (href, icon, label) => {
    if (!href) return;
    const link = el("a", "lnk");
    link.href = href; link.target = "_blank"; link.rel = "noopener";
    link.innerHTML = `<span class="li">${icon}</span>${label}`;
    box.appendChild(link);
  };
  add(p.repo_url, "🔗", "repo");
  add(p.demo_url, "🌐", "데모");
  add(p.log_url, "📄", "Log.md");
  if (p.commits?.[0]) add(p.commits[0].url, "🔀", "최신 커밋");
  return box;
}

function milestones(ms) {
  const box = el("div", "milestones");
  ms.forEach((m) => {
    const row = el("div", "ms" + (m.done ? " done" : ""));
    row.innerHTML = `<span class="box">${m.done ? "✓" : ""}</span><span class="txt">${esc(m.text)}</span>`;
    box.appendChild(row);
  });
  return box;
}

function timeline(entries) {
  const box = el("div", "timeline");
  if (!entries?.length) { box.appendChild(el("div", "empty", "로그 없음")); return box; }
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
  if (!cs?.length) { box.appendChild(el("div", "empty", "커밋 없음")); return box; }
  cs.forEach((c) => {
    const row = el("a", "commit");
    row.href = c.url; row.target = "_blank"; row.rel = "noopener";
    row.innerHTML = `<code>${esc(c.sha)}</code><span class="cmsg">${esc(c.message)}</span>` +
      `<span class="cmeta">${esc(c.author)} · ${esc(relativeTime(c.date))}</span>`;
    box.appendChild(row);
  });
  return box;
}

// 노션 토글 (HTML <form> 미사용, details/summary)
function toggle(label, content, open) {
  const det = el("details", "toggle");
  det.open = !!open;
  const sum = el("summary");
  sum.innerHTML = `<span class="tw">▸</span> ${esc(label)}`;
  det.appendChild(sum);
  const body = el("div", "toggle-body");
  body.appendChild(content);
  det.appendChild(body);
  return det;
}

// ---------- 피드백 ----------
function feedbackBlock(projectId) {
  const box = el("div", "feedback");
  box.dataset.project = projectId;
  box.appendChild(el("div", "section-label", "💬 피드백"));

  if (!feedback.available) {
    box.appendChild(el("div", "fb-warn", "⚠️ " + esc(feedback.reason || "피드백 백엔드 미연결")));
    return box;
  }

  // 입력 (HTML <form> 금지 → div + 버튼 onclick)
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

const statusLabel = (s) => ({ open: "🟢 open", done: "✅ done", wontfix: "⚪ wontfix" }[s] || s);
const initialOf = (name) => (name && name.trim() ? name.trim()[0] : "익")[0];

function renderFeedbackList(listEl, projectId) {
  const rows = fbCache[projectId] || [];
  listEl.innerHTML = "";
  if (!rows.length) { listEl.appendChild(el("div", "fb-empty", "아직 피드백이 없습니다. 첫 의견을 남겨보세요 ✍️")); return; }
  rows.forEach((f) => {
    const item = el("div", "fb-item status-" + f.status);
    item.dataset.id = f.id;
    item.innerHTML = `
      <div class="fb-meta">
        <span class="fb-avatar">${esc(initialOf(f.author))}</span>
        <b>${esc(f.author)}</b> · ${esc(f.section)} · ${esc(relativeTime(f.created_at))}
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
    refreshOpenStat();
  });
}

// ---------- 부트 ----------
async function init() {
  // 피드백 백엔드 연결 시도(실패해도 null 어댑터로 폴백 → 카드/커밋/로그는 정상).
  feedback = await createSupabaseAdapter(CFG);
  await loadData();
  wireRealtime();
  setInterval(loadData, CFG.pollMs || 60000);
}
init();
