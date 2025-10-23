// src/api/http.js
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "";
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
    // text/plain 같은 경우 그대로 반환할 수 있도록 메시지로 감쌈
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
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {};
  // GET/HEAD 또는 FormData일 때는 Content-Type을 명시하지 않음(브라우저가 boundary 포함 세팅)
  if (!isFormData && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isFormData
        ? body
        : body
        ? JSON.stringify(body)
        : undefined,
    });
  } catch (e) {
    const err = new Error("네트워크 오류로 서버에 연결할 수 없습니다.");
    err.cause = e;
    throw err;
  }

  return unwrapResponse(res);
}