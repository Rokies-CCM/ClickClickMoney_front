// src/api/budget.js
import { http } from "./http";

/** 목록 조회: /budgets?month=YYYY-MM → 실패 시 /budget */
export const loadBudgets = async (month) => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  try {
    return await http("GET", `/budgets${qs}`, undefined, true);
  } catch (e) {
    if (e.status === 404 || e.status === 405) {
      return await http("GET", `/budget${qs}`, undefined, true);
    }
    throw e;
  }
};

/** 업서트: 서버 표준 패턴 우선
 *  - 1순위: POST /budgets (create or upsert)
 *  - 2순위: POST /budget
 *  - 3순위: POST /budgets/save
 *  - 4순위: POST /budget/save
 *  ※ 403이면 인증/CSRF 이슈이므로 곧장 에러를 올려서 사용자에게 알림
 */
export const upsertBudget = async ({ month, category, amount }) => {
  const payload = { month, category: category ?? "전체", amount: Number(amount || 0) };

  const tryPost = async (path) => {
    try {
      return await http("POST", path, payload, true);
    } catch (e) {
      if (e.status === 403) {
        e.hint = "FORBIDDEN_AUTH_OR_CSRF";
      }
      throw e;
    }
  };

  try {
    return await tryPost("/budgets");
  } catch (e1) {
    if (![404, 405].includes(e1.status)) throw e1;
    try {
      return await tryPost("/budget");
    } catch (e2) {
      if (![404, 405].includes(e2.status)) throw e2;
      try {
        return await tryPost("/budgets/save");
      } catch (e3) {
        if (![404, 405].includes(e3.status)) throw e3;
        return await tryPost("/budget/save");
      }
    }
  }
};
