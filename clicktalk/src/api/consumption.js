// src/api/consumption.js
import { http, getData } from "./http";

/** 내부 유틸: 다양한 래핑에서 배열 꺼내기 */
const extractArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content; // Page.content
  if (Array.isArray(v.data)) return v.data;       // ApiResponse.data (array)
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

/** 내부 유틸: 백엔드 아이템 -> 프론트 표준 아이템으로 정규화
 *  백엔드: { id, date, amount, categoryName, categoryType }
 *  프론트 표준: { id, date, amount, category, categoryType }
 */
const normalizeItem = (it) => ({
  id: it.id,
  date: it.date,
  amount: it.amount,
  category: it.categoryName ?? it.category, // 양쪽 모두 대응
  categoryType: it.categoryType,
});

/** 지출 조회: GET /api/consumptions/load */
export async function loadConsumptions({ startDate, endDate, category, page = 0, size = 1000 } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (category) params.set("category", category);
  params.set("page", String(page));
  params.set("size", String(size));

  const resp = await http("GET", `/consumptions/load?${params.toString()}`, { auth: true });
  const data = getData(resp);
  return extractArray(data).map(normalizeItem);
}

/** 지출 생성: POST /api/consumptions/save
 *  바디 스키마(필수):
 *  {
 *    "items": [
 *      { "category": "식비", "amount": 24500, "date": "2025-10-19" },
 *      ...
 *    ],
 *    "question": "..." // 옵션
 *  }
 */
export async function createConsumptions(list, question) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("createConsumptions: items 배열이 필요합니다.");
  }
  const payload = { items: list };
  if (question) payload.question = question;

  const resp = await http("POST", "/consumptions/save", { body: payload, auth: true });
  return getData(resp);
}

/** 지출 수정: PUT /api/consumptions/{id}
 *  스웨거상 requestBody가 아니라, 쿼리 파라미터(date, category, amount)로 받습니다.
 */
export async function updateConsumption(id, payload) {
  if (id == null) throw new Error("updateConsumption: id가 필요합니다.");
  const { category, amount, date } = payload ?? {};
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (category) params.set("category", category);
  if (amount != null) params.set("amount", String(amount));

  const qs = params.toString();
  const url = qs ? `/consumptions/${id}?${qs}` : `/consumptions/${id}`;

  // 바디 없이 호출해야 백엔드 스펙과 일치
  const resp = await http("PUT", url, { auth: true });
  return getData(resp);
}

/** 지출 삭제: DELETE /api/consumptions/{id} */
export async function deleteConsumption(id) {
  if (id == null) throw new Error("deleteConsumption: id가 필요합니다.");
  const resp = await http("DELETE", `/consumptions/${id}`, { auth: true });
  return getData(resp) ?? true;
}
