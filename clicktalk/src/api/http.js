// src/api/http.js
const BASE = "/api";

// 토큰 키 통일: auth.js와 동일("accessToken")
export const getToken = () => {
  try {
    return localStorage.getItem("accessToken") || "";
  } catch {
    return "";
  }
};
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem("accessToken", t);
    else localStorage.removeItem("accessToken");
  } catch {//ignore
    }
};
export const clearToken = () => {
  try {
    localStorage.removeItem("accessToken");
  } catch { //ignore
    }
};

/**
 * 공통 http 유틸
 * - path는 '/budgets'처럼 주면 자동으로 '/api' 프록시 경유
 * - auth: true면 Authorization 헤더 Bearer 토큰 추가
 * - 응답은 content-type 보고 JSON/텍스트 모두 지원
 */
export async function http(method, url, { body, auth = false, headers = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = getToken();
    if (!token) {
      console.warn("[http] auth:true지만 토큰이 없습니다. 요청을 막습니다.", method, url);
      throw new Error("No token");
    }
    h.Authorization = `Bearer ${token}`;
  }

  // 디버그: Authorization 유무를 명확히 출력
  console.log("[http]", method, `${BASE}${url}`, {
    headers: { ...h, Authorization: h.Authorization ? "(present)" : "(missing)" },
    body,
  });

  const resp = await fetch(`${BASE}${url}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content
  if (resp.status === 204) return "";

  // 응답 파싱 (JSON/텍스트 모두 지원)
  const ct = resp.headers.get("content-type") || "";
  let data;
  try {
    if (ct.includes("application/json")) {
      data = await resp.json();
    } else {
      data = await resp.text(); // text/plain 등
    }
  } catch {
    data = "";
  }

  if (!resp.ok) {
    console.log(" [http]", resp.status, "응답 헤더:", Object.fromEntries(resp.headers.entries()));
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`HTTP ${resp.status}: ${msg.slice(0, 300)}`);
  }

  return data;
}

// 응답이 { data: ... } 형태일 때 본문만 쉽게 뽑아 쓰는 헬퍼
export const getData = (resp) =>
  resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
