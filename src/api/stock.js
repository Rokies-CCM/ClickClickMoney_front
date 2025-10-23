// src/api/stock.js

// 동일 출처 프록시 후보 (가급적 순서 유지)
// VITE_STOCK_API_BASE 를 주면 그걸 1순위로 사용 (예: /stockA)
const ENV_BASE =
  (import.meta.env.VITE_STOCK_API_BASE &&
    import.meta.env.VITE_STOCK_API_BASE.replace(/\/$/, "")) ||
  "";

const CANDIDATE_BASES = [
  ENV_BASE,              // 사용자가 지정한 값이 있으면 최우선 (예: /stockA)
  "/stockA",             // → /v1/stock/*
  "/stockB/stock",       // → /v1/* + "/stock" 접두로 붙여서 사용
  "/stockC",             // → /stock/*
  "/stockD",             // → /v1/stock/stock/*
].filter(Boolean);

let RESOLVED_BASE = null; // 최초 성공한 베이스 캐시

async function simpleReq(url, method = "GET") {
  // 단순 요청 헤더만 (프리플라이트 회피)
  const res = await fetch(url, { method, headers: { Accept: "application/json" } });
  const ct = res.headers.get("content-type") || "";
  const text = !ct.includes("application/json") ? await res.text().catch(() => "") : "";

  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
    err.status = res.status;
    throw err;
  }
  return ct.includes("application/json") ? res.json() : text;
}

async function tryBases(path, method) {
  // 1) 캐시된 성공 경로
  if (RESOLVED_BASE) {
    try {
      return { body: await simpleReq(`${RESOLVED_BASE}${path}`, method), base: RESOLVED_BASE, method };
    } catch {
      RESOLVED_BASE = null; // 실패 시 캐시 무효화
    }
  }
  // 2) 후보 순회
  for (const base of CANDIDATE_BASES) {
    try {
      const body = await simpleReq(`${base}${path}`, method);
      RESOLVED_BASE = base;
      return { body, base, method };
    } catch (e) {
      // 404/405면 다음 후보로 넘어감, 429면 그대로 던져서 상위에서 처리
      if (e?.status === 429) throw e;
      // 나머지 에러도 다음 후보로 진행
    }
  }
  // 3) 모두 실패
  const err = new Error("No reachable stock API base (all candidates failed).");
  err.status = 503;
  throw err;
}

// === 외부로 노출하는 API ===

// 시가총액 상위 (GET)
// 백엔드는 보통 /v1/stock/market-cap-top-codes 로 열려 있다고 가정
export async function fetchMarketCapTop(topN = 50, env = "real") {
  const qs = new URLSearchParams({ top_n: String(topN), env }).toString();
  const { body, base } = await tryBases(`/market-cap-top-codes?${qs}`, "GET");
  return { data: body, usedBase: base };
}

// 거래량 상위 (POST + Query)
// 백엔드는 보통 /v1/stock/top-volume (Query 파라미터)
export async function fetchTopVolume({ env = "real", market_type = "000", sort_type = "1" } = {}) {
  const qs = new URLSearchParams({ env, market_type, sort_type }).toString();

  // 1) POST 시도
  try {
    const { body, base } = await tryBases(`/top-volume?${qs}`, "POST");
    return { data: body, usedBase: base, method: "POST" };
  } catch (e) {
    // 405면 GET 지원만 하는 서버일 수 있음 → GET 재시도
    if (e?.status === 405) {
      const { body, base } = await tryBases(`/top-volume?${qs}`, "GET");
      return { data: body, usedBase: base, method: "GET" };
    }
    throw e;
  }
}

// 디버깅용: 현재 확정된 베이스 반환
export function getResolvedStockApiBase() {
  return RESOLVED_BASE;
}
