// src/api/budget.js
import { http } from "./http";

/**
 * 예산 목록 조회
 * 우선 경로: GET /budgets?month=YYYY-MM
 * 폴백 경로:  GET /budget?month=YYYY-MM
 */
export const loadBudgets = async (month) => {
  const qs = new URLSearchParams();
  if (month) qs.set("month", month);
  const query = `?${qs.toString()}`;

  try {
    return await http("GET", `/budgets${query}`, undefined, true);
  } catch (e) {
    if (e.status === 404 || e.status === 405) {
      return await http("GET", `/budget${query}`, undefined, true);
    }
    throw e;
  }
};

/**
 * 예산 업서트
 * 기본:  POST /budgets/upsert
 * 폴백1: PUT  /budgets/upsert
 * 폴백2: POST /budget/upsert
 * 폴백3: PUT  /budget/upsert
 * 폴백4: POST /budgets
 * 폴백5: PUT  /budgets
 * 폴백6: POST /budget
 * 폴백7: PUT  /budget
 * 폴백8: POST /budgets/save
 * 폴백9: PUT  /budgets/save
 * 폴백10:POST /budget/save
 * 폴백11:PUT  /budget/save
 * - category 기본값은 "전체"
 * - amount는 숫자로 강제
 */
export const upsertBudget = async ({ month, category, amount }) => {
  const payload = {
    month,
    category: category ?? "전체",
    amount: Number(amount ?? 0),
  };

  const trySeq = async (...steps) => {
    let lastErr;
    for (const [method, path] of steps) {
      try {
        return await http(method, path, payload, true);
      } catch (e) {
        lastErr = e;
        if (![404, 405].includes(e.status)) throw e; // 다른 에러는 즉시 중단
      }
    }
    throw lastErr;
  };

  return trySeq(
    ["POST", "/budgets/upsert"],
    ["PUT",  "/budgets/upsert"],
    ["POST", "/budget/upsert"],
    ["PUT",  "/budget/upsert"],
    ["POST", "/budgets"],
    ["PUT",  "/budgets"],
    ["POST", "/budget"],
    ["PUT",  "/budget"],
    ["POST", "/budgets/save"],
    ["PUT",  "/budgets/save"],
    ["POST", "/budget/save"],
    ["PUT",  "/budget/save"],
  );
};
