// src/api/tips.js
const CHATBOT_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CHATBOT_URL) || "";

/**
 * 내부 공통 호출
 * @param {"tips"|"caution"} mode
 * @param {object} payload
 * @param {{ useLLM?: boolean }} opts
 */
async function callTips(mode, payload, { useLLM = true } = {}) {
  const qs = new URLSearchParams();
  if (useLLM) qs.set("llm", "true");
  if (mode) qs.set("mode", mode);

  let res;
  try {
    // ✅ 서버는 /v1/tips 로 마운트 (server/main.py에서 prefix="/v1")
    res = await fetch(`${CHATBOT_BASE}/v1/tips?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const err = new Error("AI 서버에 연결할 수 없습니다.");
    err.cause = e;
    throw err;
  }
  if (!res.ok) {
    let data;
    try { data = await res.json(); } catch { /* noop */ }
    const msg = data?.error?.message || res.statusText || "AI 생성 실패";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return res.json();
}

/**
 * AI 절약 팁 생성
 * @param {{ yearMonth:string, totalAmount:number, budget:number, byCategory:{name:string,amount:number}[] }} payload
 * @param {{ useLLM?: boolean }} opts
 * @returns {Promise<{ tips: string[], source?: string, fallback?: string }>}
 */
export function generateTips(payload, opts) {
  return callTips("tips", payload, opts);
}

/**
 * AI 주의/경고 생성
 * @param {{ yearMonth:string, totalAmount:number, budget:number, byCategory:{name:string,amount:number}[] }} payload
 * @param {{ useLLM?: boolean }} opts
 * @returns {Promise<{ tips: string[], source?: string, fallback?: string }>}
 */
export function generateCautions(payload, opts) {
  return callTips("caution", payload, opts);
}
