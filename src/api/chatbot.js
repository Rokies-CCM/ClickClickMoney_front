// src/api/chatbot.js
import { getToken } from "./http"; // 이 줄 추가!

const CHATBOT_BASE = import.meta.env.VITE_CHATBOT_URL || "/chatbot";

export async function askChat({ question, stream = true, domain, facts }) {
  // 토큰 가져오기
  const token = getToken();
  
  // 헤더 객체 생성
  const headers = {
    "Content-Type": "application/json"
  };
  
  // 토큰이 있으면 Authorization 헤더 추가
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${CHATBOT_BASE}/v1/chat`, {
    method: "POST",
    headers: headers, //  수정된 헤더 사용
    body: JSON.stringify({ question, stream, domain, facts }),
  });

  if (stream) {
    if (!res.body) throw new Error("Streaming not supported");
    return res.body.getReader();
  }

  const data = await res.json();
  return data;
}