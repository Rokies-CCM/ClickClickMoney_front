// src/api/chatbot.js

import { getToken } from "./http";

const CHATBOT_BASE = import.meta.env.VITE_CHATBOT_URL || "/chatbot";

export async function askChat({
  question,
  // 🔻 기본값을 false로 바꿈 (중요!!)
  stream = false,
  domain,
  facts,
  chatHistory,
}) {
  // 액세스 토큰
  const token = getToken && getToken();

  // 헤더 구성
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 서버 호출
  const res = await fetch(`${CHATBOT_BASE}/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question,
      stream, // 이제 false로 간다
      domain,
      facts,
      chat_history: chatHistory,
    }),
  });

  // 우리는 이제 스트리밍 안 쓸 거라 reader 반환 안 해.
  const data = await res.json();
  return data;
}
