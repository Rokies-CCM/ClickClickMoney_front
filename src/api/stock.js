// src/api/stock.js
const ENV_BASE =
  (import.meta.env.VITE_STOCK_API_BASE &&
    import.meta.env.VITE_STOCK_API_BASE.replace(/\/$/, "")) ||
  "";

// 후보군을 단일 베이스로 단순화
const CANDIDATE_BASES = [ENV_BASE].filter(Boolean);

let RESOLVED_BASE = null;

async function simpleReq(url, method = "GET") {
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
  const base = CANDIDATE_BASES[0]; // 명시 베이스만 사용
  if (!base) {
    const err = new Error("VITE_STOCK_API_BASE가 비어 있습니다.");
    err.status = 503;
    throw err;
  }
  const body = await simpleReq(`${base}${path}`, method);
  RESOLVED_BASE = base;
  return { body, base, method };
}

export async function fetchMarketCapTop(topN = 50, env = "real") {
  const qs = new URLSearchParams({ top_n: String(topN), env }).toString();
  const { body, base } = await tryBases(`/market-cap-top-codes?${qs}`, "GET");
  return { data: body, usedBase: base };
}

export async function fetchTopVolume({ env = "real", market_type = "000", sort_type = "1" } = {}) {
  const qs = new URLSearchParams({ env, market_type, sort_type }).toString();
  try {
    const { body, base } = await tryBases(`/top-volume?${qs}`, "POST");
    return { data: body, usedBase: base, method: "POST" };
  } catch (e) {
    if (e?.status === 405) {
      const { body, base } = await tryBases(`/top-volume?${qs}`, "GET");
      return { data: body, usedBase: base, method: "GET" };
    }
    throw e;
  }
}

export function getResolvedStockApiBase() {
  return RESOLVED_BASE;
}
