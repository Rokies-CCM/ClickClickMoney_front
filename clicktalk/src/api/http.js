// src/api/http.js
const API_BASE = ""; // ✅ 프록시 사용: 절대 URL 제거
const TOKEN_KEY = "auth_access";

// 토큰 보관/조회/삭제
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// ApiResponse 래퍼가 있어도/없어도 동작하게 언래핑
async function unwrapResponse(res) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // JSON이 아니면(plain text 응답 등) 메시지로 처리
    json = text ? { message: text } : null;
  }

  const payload = json && (json.data ?? json.result ?? json.payload ?? json);

  if (!res.ok) {
    const msg = payload?.message ?? res.statusText ?? "Request failed";
    const error = new Error(msg);
    error.status = res.status;
    error.data = payload;
    throw error;
  }
  return payload;
}

// 공통 요청 함수
export async function http(method, path, body, withAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err = new Error("네트워크 오류로 서버에 연결할 수 없습니다.");
    err.cause = e;
    throw err;
  }

  return unwrapResponse(res);
}
