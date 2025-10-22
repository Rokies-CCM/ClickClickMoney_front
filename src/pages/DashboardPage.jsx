// src/pages/DashboardPage.jsx
import { useEffect, useState, useMemo } from "react";
import BudgetCard from "../components/BudgetCard";
import MissionCard from "../components/MissionCard";
import PointCard from "../components/PointCard";
import { loadBudgets } from "../api/budget";
import { loadConsumptions } from "../api/consumption";

const WALLET_KEY = "points_wallet_v1";

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

function loadWalletSafely() {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) return { current: 0, totalEarned: 0, totalUsed: 0, history: [] };
    const w = JSON.parse(raw);
    return {
      current: Number(w.current || 0),
      totalEarned: Number(w.totalEarned || 0),
      totalUsed: Number(w.totalUsed || 0),
      history: Array.isArray(w.history) ? w.history : [],
    };
  } catch {
    return { current: 0, totalEarned: 0, totalUsed: 0, history: [] };
  }
}

const thisYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const DashboardPage = ({ go }) => {
  const [wallet, setWallet] = useState(loadWalletSafely());
  const [budgetSum, setBudgetSum] = useState(0);
  const [expenseSum, setExpenseSum] = useState(0);

  const missionData = {
    title: "금융 퀴즈",
    desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
    progress: 1,
    total: 3,
    reward: 30,
  };

  // 포인트 지갑 최신화
  useEffect(() => {
    const onFocus = () => setWallet(loadWalletSafely());
    const onStorage = (e) => {
      if (e.key === WALLET_KEY) setWallet(loadWalletSafely());
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 예산/지출 집계
  useEffect(() => {
    const ym = thisYm();
    const d = new Date();
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    (async () => {
      try {
        // ✅ 인증 포함된 loadBudgets 사용
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

  const recentLogs =
    (wallet.history || [])
      .slice(-3)
      .reverse()
      .map((h) => ({ label: h.desc, value: Number(h.amount || 0) }));

  const pointData = useMemo(
    () => ({ total: wallet.current, logs: recentLogs }),
    [wallet.current, recentLogs]
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
          { label: "보유 포인트", value: `${wallet.current}p` },
          { label: "이번 달 지출", value: `${expenseSum.toLocaleString()}원` },
          { label: "전체 예산", value: `${budgetSum.toLocaleString()}원` },
          {
            label: "달성한 미션",
            value: `${(wallet.history || []).filter((h) => h.desc === "미션 완료 보상").length}개`,
          },
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