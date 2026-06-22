// public/feedback-supabase.js
// Supabase 구현 어댑터 (feedback-adapter.js 포트의 구현체).
//
// 장애 격리(DESIGN §8): supabase-js(CDN)를 정적 import 하지 않고 createSupabaseAdapter
// 호출 시 동적 import 한다. CDN/네트워크 실패가 app.js 전체 렌더(카드/커밋/로그)를
// 막지 않도록, 실패하면 null 어댑터로 폴백해 "피드백 영역만" 비활성화한다.
//
// 포트 계약 유지: 반환 객체는 list/add/setStatus/subscribe 시그니처를 그대로 따른다.
// 차이점은 팩토리가 async 라는 것뿐 — app.js init()에서 await 한다.
import { createNullAdapter } from "./feedback-adapter.js";

const SUPABASE_ESM = "https://esm.sh/@supabase/supabase-js@2";

export async function createSupabaseAdapter(cfg) {
  // 1) 설정 누락/placeholder → 미연결 폴백
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey ||
      cfg.supabaseUrl.includes("YOUR_PROJECT") ||
      cfg.supabaseAnonKey.includes("YOUR_ANON_KEY")) {
    return createNullAdapter("Supabase 설정이 비어 있습니다 (config.js 확인)");
  }

  // 2) 클라이언트 로드 실패(CDN/네트워크) → 미연결 폴백 (대시보드 나머지는 정상)
  let createClient;
  try {
    ({ createClient } = await import(SUPABASE_ESM));
  } catch (e) {
    return createNullAdapter("피드백 백엔드 로드 실패 (네트워크 확인 후 새로고침)");
  }

  let sb;
  try {
    sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 5 } },
    });
  } catch (e) {
    return createNullAdapter("Supabase 초기화 실패: " + (e?.message || e));
  }

  return {
    available: true,
    reason: null,

    async list(projectId) {
      const { data, error } = await sb
        .from("feedback")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async add({ project_id, section, author, body }) {
      const { data, error } = await sb
        .from("feedback")
        .insert({ project_id, section, author: author || "익명", body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async setStatus(id, status) {
      const { error } = await sb.from("feedback").update({ status }).eq("id", id);
      if (error) throw error;
    },

    // 모든 프로젝트 변경을 구독. onChange(eventType, row) 호출.
    subscribe(onChange) {
      const ch = sb
        .channel("feedback-stream")
        .on("postgres_changes",
            { event: "*", schema: "public", table: "feedback" },
            (payload) => onChange(payload.eventType, payload.new || payload.old))
        .subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}
