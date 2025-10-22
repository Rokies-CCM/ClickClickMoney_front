// src/api/budget.js
import { http } from "./http";

// 조회
export async function loadBudgets(month) {
  const qs = new URLSearchParams({ month }).toString();
  // ← 반드시 auth: true
  return http("GET", `/budgets?${qs}`, { auth: true });
}

// 저장(업서트)
export async function upsertBudget({ month, category, amount }) {
  // ← 반드시 auth: true
  return http("POST", `/budgets`, { auth: true, body: { month, category, amount } });
}
