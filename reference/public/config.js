// public/config.js — 클라이언트 공개용 설정.
// 여기 값은 브라우저에 그대로 노출됨. anon key는 RLS로 보호되므로 공개 안전.
// PAT/서비스키 절대 넣지 말 것.
window.DASHBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  pollMs: 60000 // data.json 폴링 주기(ms)
};
