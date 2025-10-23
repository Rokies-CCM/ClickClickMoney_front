// src/api/quiz.js
import { getToken } from "./http"; // 토큰 일관성

// FastAPI를 :8000에 띄우고 vite 프록시에서 '/chatbot'을 :8000으로 보낸다는 전제
const BASE = "/chatbot/v1/quiz";

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  try {
    const token = getToken(); // ✅ sessionStorage('auth_access')
    if (token) h.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  return h;
}

/** 태그 기준으로 쉬움/보통/어려움 3개 한 번에 로드 */
export async function fetchQuizBatch(tag) {
  const res = await fetch(`${BASE}/batch`, {
    method: "POST",
    headers: authHeaders(), // ✅ 인증 헤더 포함
    body: JSON.stringify({ tag }),
  });
  if (!res.ok) throw new Error(`batch 실패: ${res.status}`);
  const data = await res.json();
  return data.quizzes || [];
}

/** 단일 문제 채점 */
export async function submitQuizAnswer(
  question_id,
  user_answer /* "A"|"B"|"C"|"D" */
) {
  const res = await fetch(`${BASE}/answer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question_id, user_answer }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`submitQuizAnswer 실패: ${res.status} ${msg}`);
  }
  return res.json();
}