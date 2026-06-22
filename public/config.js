// public/config.js — 클라이언트 공개용 설정.
// 여기 값은 브라우저에 그대로 노출됨. PAT/서비스키는 절대 넣지 말 것.
// (anon key·giscus ID·Discussions URL은 모두 공개 안전한 값)
window.DASHBOARD_CONFIG = {
  pollMs: 60000, // data.json 폴링 주기(ms)

  // 피드백 백엔드: "discussions"(가장 간단, 설치 0) | "giscus"(인라인 댓글) | "supabase"(익명·실시간)
  feedbackBackend: "discussions",

  // --- Discussions 링크 방식 (설치/키 불필요) ---
  // 카드의 "피드백 남기러 가기" 버튼이 프로젝트별 GitHub 토론 스레드로 이동.
  // 새 프로젝트 추가 시 byProject에 { 프로젝트id: 토론URL } 한 줄 추가하면 됨.
  discussions: {
    base: "https://github.com/Kim-Hakseong/dev-dashboard/discussions",
    byProject: {
      "nexys-blockly": "https://github.com/Kim-Hakseong/dev-dashboard/discussions/1",
      "flight-sim2":   "https://github.com/Kim-Hakseong/dev-dashboard/discussions/2"
    }
  },

  // --- Giscus (인라인 댓글) — feedbackBackend를 "giscus"로 바꾸면 사용. giscus 앱 설치 필요 ---
  giscus: {
    repo: "Kim-Hakseong/dev-dashboard",
    repoId: "R_kgDOTBwPxA",
    category: "General",
    categoryId: "DIC_kwDOTBwPxM4C_qR8",
    theme: "light",
    lang: "ko"
  },

  // --- Supabase (익명·실시간) — feedbackBackend를 "supabase"로 바꾸고 아래 채우면 사용 ---
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
};
