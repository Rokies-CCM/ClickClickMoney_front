// MissionCard: 대시보드에서 “오늘의 미션” 미리보기 카드
// - 기존 data 형태 유지 + mission 형태도 허용
// - 클릭/버튼 클릭 시 onClick 호출 → 미션 페이지로 이동

const MissionCard = ({ data, mission, onClick, fullHeight }) => {
  // backward-compat: data | mission 둘 다 지원
  const src = mission || data || {};
  const title = src.title || "오늘의 미션";
  const desc = src.desc || "";
  const progress = Number(src.progress || 0);
  const total = Math.max(1, Number(src.total || 1));
  const percent = Math.max(0, Math.min(100, Math.round((progress / total) * 100)));
  const rewardText =
    typeof src.reward === "string"
      ? src.reward
      : `${Number(src.reward || 0)}p`;

  const onHover = (e, enter) => {
    if (enter) {
      e.currentTarget.style.transform = "translateY(-6px)";
      e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
      e.currentTarget.style.borderColor = "#FFD858";
    } else {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#ccc";
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "28px 24px",
        transition: "all 0.25s ease",
        minHeight: 260,
        height: fullHeight ? "100%" : "auto",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        cursor: "pointer",
        background: "#fff",
      }}
      onMouseEnter={(e) => onHover(e, true)}
      onMouseLeave={(e) => onHover(e, false)}
      aria-label="오늘의 미션 카드"
      title="오늘의 미션 자세히 보기"
    >
      {/* 본문 영역 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600 }}>오늘의 미션</h3>
          <span style={{ fontSize: "18px" }}>→</span>
        </div>

        <p style={{ fontSize: "15px", color: "#333", marginBottom: "6px" }}>
          {title}
        </p>
        <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px" }}>
          {desc}
        </p>

        {/* 진행률 */}
        <p style={{ fontSize: "13px", color: "#555" }}>진행률</p>
        <div
          style={{
            backgroundColor: "#ddd",
            height: "8px",
            borderRadius: "4px",
            overflow: "hidden",
            margin: "4px 0 8px 0",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              backgroundColor: "#000",
            }}
          />
        </div>
        <p style={{ fontSize: "13px", color: "#555" }}>
          {progress}/{total}
        </p>
      </div>

      {/* 푸터(버튼/포인트) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
        }}
      >
        <span style={{ fontSize: "14px", color: "#333" }}>
          {rewardText}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          style={{
            backgroundColor: "#FFD858",
            border: "none",
            borderRadius: "20px",
            padding: "6px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          aria-label="미션 자세히 보러가기"
          title="미션 자세히 보러가기"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default MissionCard;
