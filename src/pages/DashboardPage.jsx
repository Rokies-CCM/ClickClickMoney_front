// src/pages/DashboardPage.jsx
import { useEffect, useState, useMemo } from "react";
import BudgetCard from "../components/BudgetCard";
import MissionCard from "../components/MissionCard";
import PointCard from "../components/PointCard";
import { loadBudgets } from "../api/budget";
import { loadConsumptions } from "../api/consumption";
import { getMyPoints, getMyPointTx } from "../api/points"; // ✅ 서버 포인트 API

// 어떤 응답 형태여도 배열로 변환 ([], {content:[]}, {data:[]}, {items:[]}, {results:[]})
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

const thisYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const labelFromReason = (value) => {
  const key = String(value ?? "").toUpperCase();

  switch (key) {
    // 일반 미션류는 전부 "미션 완료 보상"으로
    case "MISSION_REWARD":
    case "QUIZ":
    case "VISIT":
    case "BUDGET":
    case "EXPENSE":
    case "EXCHANGE":
      return "미션 완료 보상";

    // 교환(차감)
    case "REDEEM":
      return "포인트 교환";

    // 복권 표기: 과거/현재 키 모두 대응
    case "LOTTERY_REWARD":
    case "LOTTERY_DAILY":
    case "LOTTERY":
      return "복권 당첨";

    default:
      // 값 없으면 기본 문구, 있으면 언더스코어 → 공백
      if (!value) return "포인트 변경";
      return String(value).replace(/_/g, " ");
  }
};

const DashboardPage = ({ go }) => {
  // ✅ 서버에서 가져오는 사용자별 포인트
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState([]); // [{delta, reason, createdAt}...]
  const [missionAchievedCount, setMissionAchievedCount] = useState(0);

  // 예산/지출
  const [budgetSum, setBudgetSum] = useState(0);
  const [expenseSum, setExpenseSum] = useState(0);

  const missionData = {
    title: "금융 퀴즈",
    desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
    progress: 1,
    total: 3,
    reward: 30,
  };

  // ✅ 포인트 요약 + 내역 로드
  useEffect(() => {
    (async () => {
      try {
        // 최근 5건을 서버에서 바로 받음
        const summary = await getMyPoints(5); // { balance, totalEarned, totalSpent, recent:[...] }
        setBalance(Number(summary.balance || 0));
        setRecentTx(Array.isArray(summary.recent) ? summary.recent : []);
      } catch (e) {
        console.warn("포인트 요약 조회 실패:", e);
        setBalance(0);
        setRecentTx([]);
      }

      try {
        // 달성한 미션 수 집계(첫 페이지 기준)
        const page = await getMyPointTx({ page: 0, size: 100 });
        const list = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
        const count = list.filter((t) => t.reason === "MISSION_REWARD" && Number(t.delta) > 0).length;
        setMissionAchievedCount(count);
      } catch (e) {
        console.warn("포인트 내역 조회 실패:", e);
        setMissionAchievedCount(0);
      }
    })();
  }, []);

  // 예산/지출 집계
  useEffect(() => {
    const ym = thisYm();
    const d = new Date();
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    (async () => {
      try {
        const budgetsResp = await loadBudgets(ym);
        const budgets = asArray(budgetsResp);
        setBudgetSum(budgets.reduce((s, b) => s + Number(b.amount || 0), 0));
      } catch (e) {
        console.warn("예산 집계 실패:", e);
        setBudgetSum(0);
      }

      try {
        const consResp = await loadConsumptions({ startDate, endDate, page: 0, size: 1000 });
        const cons = asArray(consResp);
        setExpenseSum(cons.reduce((s, c) => s + Number(c.amount || 0), 0));
      } catch (e) {
        console.warn("지출 집계 실패:", e);
        setExpenseSum(0);
      }
    })();
  }, []);

  // PointCard 데이터 변환
  const recentLogs = (recentTx || [])
    .slice(0, 3)
    .map((t) => ({ label: labelFromReason(t.reason), value: Number(t.delta || 0) }));

  const pointData = useMemo(
    () => ({ total: balance, logs: recentLogs }),
    [balance, recentLogs]
  );

  const budgetData = useMemo(
    () => ({ used: expenseSum, total: budgetSum }),
    [expenseSum, budgetSum]
  );

  const goToMissions = () => go("/mission?tab=진행중");

  return (
    <section
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "60px 100px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* === 제목 === */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "8px" }}>
          내 지갑
        </h1>
        <p style={{ color: "#555", fontSize: "16px" }}>
          당신의 재정 현황을 확인하세요
        </p>
      </div>

      {/* === 상단 요약 4개 === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "50px",
        }}
      >
        {[
          { label: "보유 포인트", value: `${balance}p` },
          { label: "이번 달 지출", value: `${expenseSum.toLocaleString()}원` },
          { label: "전체 예산", value: `${budgetSum.toLocaleString()}원` },
          { label: "달성한 미션", value: `${missionAchievedCount}개` },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = "#FFD858";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#ccc";
            }}
          >
            <p style={{ color: "#777", fontSize: "14px" }}>{item.label}</p>
            <h3 style={{ fontSize: "20px", fontWeight: 600, marginTop: "8px" }}>
              {item.value}
            </h3>
          </div>
        ))}
      </div>

      {/* === 하단 카드 3개 === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          alignItems: "stretch",
        }}
      >
        <BudgetCard data={budgetData} />

        <div
          role="button"
          tabIndex={0}
          aria-label="오늘의 미션으로 이동"
          onClick={goToMissions}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToMissions();
            }
          }}
          style={{ cursor: "pointer", outline: "none", height: "100%" }}
          title="오늘의 미션으로 이동"
        >
          <MissionCard data={missionData} fullHeight />
        </div>

        <PointCard data={pointData} />
      </div>
    </section>
  );
};

export default DashboardPage;
