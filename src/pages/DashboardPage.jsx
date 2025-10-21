// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import BudgetCard from "../components/BudgetCard";
import MissionCard from "../components/MissionCard";
import PointCard from "../components/PointCard";

// LocalStorage wallet key
const WALLET_KEY = "points_wallet_v1";

// 안전하게 지갑 로드
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

const DashboardPage = ({ go }) => {
  // 추후 API 연결용 상태
  const budgetData = { used: 100000, total: 200000 };
  const missionData = {
    title: "금융 퀴즈",
    desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
    progress: 1,
    total: 3,
    reward: 30,
  };

  // ---- 포인트 지갑 연동 ----
  const [wallet, setWallet] = useState(loadWalletSafely());

  // 초기 로드
  useEffect(() => {
    setWallet(loadWalletSafely());
  }, []);

  // 창 포커스/스토리지 변경 시 최신화
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

  // 완료된 미션 개수 집계 (지갑 내역에서 "미션 완료 보상" 카운트)
  const completedMissions =
    (wallet.history || []).filter((h) => h.desc === "미션 완료 보상").length;

  // PointCard에 전달할 데이터 구성
  const recentLogs =
    wallet.history
      .slice(-3) // 최근 3건
      .reverse() // 최신 먼저
      .map((h) => ({
        label: h.desc,
        value: Number(h.amount || 0), // "+30" -> 30, "-20" -> -20
      })) || [];

  const pointData = {
    total: wallet.current, // 보유 포인트
    logs: recentLogs,
  };

  const goToMissions = () => {
    go("/mission?tab=진행중"); // 해시 라우터용 이동
  };

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
          { label: "이번 달 지출", value: `${budgetData.used.toLocaleString()}원` },
          { label: "전체 예산", value: `${budgetData.total.toLocaleString()}원` },
          { label: "달성한 미션", value: `${completedMissions}개` }, // ✅ 연동된 값
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
              e.currentTarget.style.boxShadow =
                "0 6px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = "#FFD858";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#ccc";
            }}
          >
            <p style={{ color: "#777", fontSize: "14px" }}>{item.label}</p>
            <h3
              style={{ fontSize: "20px", fontWeight: 600, marginTop: "8px" }}
            >
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

        {/* 오늘의 미션 카드: 클릭/키보드로 이동 가능 */}
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

        {/* 포인트 카드: 보유/최근 기록 전달 */}
        <PointCard data={pointData} />
      </div>
    </section>
  );
};

export default DashboardPage;
