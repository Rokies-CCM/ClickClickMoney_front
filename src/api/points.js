// path : src/api/points.js
// src/api/points.js
import { http } from "./http";

// 요약 (보유/총적립/총사용/최근 N건)
export const getMyPoints = async (recent = 5) =>
  http("GET", `/points/me?recent=${recent}`, null, true);

// 내역 페이지 (페이지네이션)
export const getMyPointTx = async ({ page = 0, size = 50 } = {}) =>
  http("GET", `/points/tx?page=${page}&size=${size}`, null, true);

// 교환(차감)
export const redeemPoints = async (body /* { amount } */) =>
  http("POST", "/points/redeem", body, true);

// 카탈로그 복권(무제한) — 랜덤 보상 지급 후 { reward } 반환
export const playCatalogLottery = async () =>
  http("POST", `/points/lottery/catalog/play?_=${Date.now()}`, null, true);

// (옵션) 내부 적립 API는 클라이언트에서 호출하지 않도록 주석 처리
// export const internalAward = async (payload) =>
//   http("POST", "/internal/points/award", payload, true);
