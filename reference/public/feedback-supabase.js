// public/feedback-supabase.js
// Supabase 구현 어댑터. supabase-js v2를 CDN ESM으로 import.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNullAdapter } from "./feedback-adapter.js";

export function createSupabaseAdapter(cfg) {
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey ||
      cfg.supabaseUrl.includes("YOUR_PROJECT")) {
    return createNullAdapter("Supabase 설정이 비어 있습니다 (config.js 확인)");
  }

  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 5 } },
  });

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
