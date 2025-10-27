// src/api/http.js
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "/api";

const TOKEN_KEY = "auth_access";

// 토큰 보관/조회/삭제
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

// ApiResponse 래퍼가 있어도/없어도 동작하게 언래핑
async function unwrapResponse(res) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
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

async function doFetch(method, path, body, withAuth, attachCsrfHeader = true) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {};
  if (!isFormData && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // 변경 메서드면 쿠키 기반 CSRF 헤더 자동 첨부
  const needsCsrf =
    attachCsrfHeader && !["GET", "HEAD", "OPTIONS"].includes(method);
  if (needsCsrf) {
    const xsrf = getCookie("XSRF-TOKEN") || getCookie("XSRF_TOKEN");
    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      credentials: "include", // 쿠키 전달 필수
    });
  } catch (e) {
    const err = new Error("네트워크 오류로 서버에 연결할 수 없습니다.");
    err.cause = e;
    throw err;
  }
  return res;
}

// 공통 요청 함수
export async function http(method, path, body, withAuth = false) {
  // 1차 시도
  let res = await doFetch(method, path, body, withAuth, true);

  // 403 이고, CSRF 가능성이 있으면 /csrf 프라임 후 1회 재시도
  if (res.status === 403) {
    try {
      // 서버가 CookieCsrfTokenRepository를 쓰면 /csrf GET으로 토큰을 내려줍니다.
      const prime = await doFetch("GET", "/csrf", undefined, withAuth, false);
      // /csrf가 200이 아니더라도, 쿠키가 왔을 수 있으니 무시하고 진행
      try { await prime.text?.(); } catch {
        //
      }
    } catch {
      // /csrf가 없거나(404/405) 인증 필요(401)여도 그냥 넘어가고 한 번 더 시도
    }
    res = await doFetch(method, path, body, withAuth, true);
  }

  return unwrapResponse(res);
}
