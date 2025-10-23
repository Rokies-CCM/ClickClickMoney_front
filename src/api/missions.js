// src/api/missions.js
import { http } from "./http";

/** 오늘의 미션 현황 (항상 네트워크 치도록 ts 파라미터 추가) */
export const getTodayMissions = async () =>
  http("GET", `/missions/today?_=${Date.now()}`, null, true);

/** 퀴즈 제출/채점 결과 기록 */
export const submitTodayQuiz = async (payload) =>
  http("POST", `/missions/quiz/submit?_=${Date.now()}`, payload, true);

/** 미션 보상 수령 */
export const claimMission = async (code) =>
  http("POST", `/missions/claim?_=${Date.now()}`, { code }, true);

/** 미션 완료(보상 지급) – (퀴즈/방문/예산/지출/교환 등 레거시 소스 기반) */
export const completeMission = async (params = {}) => {
  const { source = "quiz", amount = 30 } = params;
  const q = new URLSearchParams({
    source,
    amount: String(amount),
    _: String(Date.now()), // cache buster
  }).toString();
  return http("POST", `/missions/complete?${q}`, null, true);
};

/** 하루 1회 무료 복권 플레이 (신규, PlayLotteryResponse 반환) */
export const playDailyLottery = async () =>
  http("POST", `/missions/lottery/daily/play?_=${Date.now()}`, null, true);