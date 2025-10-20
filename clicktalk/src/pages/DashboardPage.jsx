import BudgetCard from "../components/BudgetCard";
import MissionCard from "../components/MissionCard";
import PointCard from "../components/PointCard";

const DashboardPage = () => {
  // 추후 API 연결용 상태
  const budgetData = { used: 100000, total: 200000 };
  const missionData = {
    title: "금융 퀴즈",
    desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
    progress: 1,
    total: 3,
    reward: 30,
  };
  const pointData = {
    total: 0,
    logs: [
      { label: "출석체크", value: 10 },
      { label: "퀴즈 풀기", value: 5 },
      { label: "웹 페이지 방문", value: 15 },
    ],
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
          { label: "보유 포인트", value: `${pointData.total}p` },
          { label: "이번 달 지출", value: `${budgetData.used.toLocaleString()}원` },
          { label: "전체 예산", value: `${budgetData.total.toLocaleString()}원` },
          { label: "달성한 미션", value: `${missionData.progress}개` },
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
        }}
      >
        <BudgetCard data={budgetData} />
        <MissionCard data={missionData} />
        <PointCard data={pointData} />
      </div>
    </section>
  );
};

export default DashboardPage;
