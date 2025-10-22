// src/api/memo.js
import { http } from "./http";

/** 소비 항목 메모 저장/업데이트 */
export const upsertMemo = (consumptionId, value) =>
  http("POST", `/memo/${encodeURIComponent(consumptionId)}`, {
    auth: true,
    body: { value },
  });

/** 소비 항목 메모 조회 (백엔드가 text/plain 또는 JSON 둘 다 가능) */
export const loadMemo = (consumptionId) =>
  http("GET", `/memo/${encodeURIComponent(consumptionId)}`, {
    auth: true,
  });
