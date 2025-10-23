// src/api/chatbot.js
// 스트리밍(SSE) 우선, 불가 시 JSON 폴백
const CHATBOT_BASE = import.meta.env.VITE_CHATBOT_URL || "/chatbot";

export async function askChat({ question, stream = true, domain, facts }) {
  const res = await fetch(`${CHATBOT_BASE}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, stream, domain, facts }),
  });

  if (stream) {
    if (!res.body) throw new Error("Streaming not supported");
    return res.body.getReader(); // 호출 측에서 reader 소비
  }

  // 비스트리밍 모드
  const data = await res.json();
  return data;
}