// src/api/consumption.js
import { http } from "./http";

/** 여러 건 저장 (백엔드 DTO: { items: [{ category, amount, date }] }) */
export const saveMany = (items) =>
  http("POST", "/consumptions/save", { items }, true);

/** 한 건 저장 */
export const saveOne = (item) => saveMany([item]);

/** 기간 로드 (Page 객체 반환 가능: { content, totalElements, ... }) */
export const loadRange = (
  startDate,
  endDate,
  { category, page = 0, size = 200 } = {}
) => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (category) qs.set("category", category);
  qs.set("page", page);
  qs.set("size", size);
  return http("GET", `/consumptions/load?${qs.toString()}`, undefined, true);
};

/** 월 로드 (YYYY-MM) → 해당 월의 1일~마지막날 */
export const loadMonth = async (ym, opts = {}) => {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // 마지막날
  const toStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return loadRange(toStr(start), toStr(end), opts);
};

/** 수정(쿼리파라미터로 필요한 필드만 전달) */
export const updateOne = (id, { date, category, amount } = {}) => {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (category) qs.set("category", category);
  if (amount != null) qs.set("amount", String(amount));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http("PUT", `/consumptions/${id}${suffix}`, undefined, true);
};

/** 삭제 */
export const deleteOne = (id) =>
  http("DELETE", `/consumptions/${id}`, undefined, true);

/* ---- 하위 호환 별칭(기존 import들을 위해) ---- */
export const createConsumptions = saveMany;

// 기존 코드가 loadConsumptions({ startDate, endDate, ... }) 형태로 호출해도 안전하도록
export const loadConsumptions = (params = {}) => {
  const { startDate, endDate, ...opts } = params;
  return loadRange(startDate, endDate, opts);
};

export const updateConsumption = updateOne;
export const deleteConsumption = deleteOne;
