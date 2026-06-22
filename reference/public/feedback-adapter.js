// public/feedback-adapter.js
// 피드백 백엔드 "포트(인터페이스)" 정의.
// 구현체(feedback-supabase.js 등)는 아래 4개 메서드를 가진 객체를 반환해야 한다.
//
//   list(projectId): Promise<Array<{id, project_id, section, author, body, status, created_at}>>
//   add({project_id, section, author, body}): Promise<row>
//   setStatus(id, status): Promise<void>            // status: open|done|wontfix
//   subscribe(onChange): unsubscribeFn              // 새 row/변경 시 onChange(row) 호출
//
// 나중에 Giscus/Cloudflare 어댑터로 교체할 때 이 시그니처만 맞추면 app.js 수정 불필요.

export function createNullAdapter(reason = "피드백 백엔드 미연결") {
  return {
    available: false,
    reason,
    async list() { return []; },
    async add() { throw new Error(reason); },
    async setStatus() { throw new Error(reason); },
    subscribe() { return () => {}; },
  };
}
