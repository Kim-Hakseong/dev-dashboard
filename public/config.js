// public/config.js — 클라이언트 공개용 설정.
// 여기 값은 브라우저에 그대로 노출됨. PAT/서비스키는 절대 넣지 말 것.
// (anon key·giscus ID는 모두 공개 안전한 값)
window.DASHBOARD_CONFIG = {
  pollMs: 60000, // data.json 폴링 주기(ms)

  // 피드백 백엔드 선택: "giscus"(GitHub Discussions) | "supabase"(익명·실시간)
  feedbackBackend: "giscus",

  // --- Giscus (GitHub Discussions 기반 게시판) ---
  // 활성 조건: dev-dashboard repo에 Discussions 켜짐 + giscus 앱 설치 + repo public.
  // repoId/categoryId는 공개 식별자라 노출 안전.
  giscus: {
    repo: "Kim-Hakseong/dev-dashboard",
    repoId: "R_kgDOTBwPxA",
    category: "General",
    categoryId: "DIC_kwDOTBwPxM4C_qR8",
    theme: "light",   // light | dark | noborder_light ...
    lang: "ko"
  },

  // --- Supabase (익명·실시간) — feedbackBackend를 "supabase"로 바꾸고 아래 채우면 사용 ---
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
};
