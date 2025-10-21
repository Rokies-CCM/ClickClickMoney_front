const MissionCard = ({ data }) => {
  const { title, desc, progress, total, reward } = data;
  const percent = Math.max(0, Math.min(100, Math.round((progress / total) * 100)));

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
      style={{
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "28px 24px",
        transition: "all 0.25s ease",
        minHeight: 260,           // 기본 최소 높이
        height: "100%",           // ✅ 셀 높이 꽉 채우기
        display: "flex",          // ✅ 위·아래로 영역 분리
        flexDirection: "column",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => onHover(e, true)}
      onMouseLeave={(e) => onHover(e, false)}
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

      {/* 푸터(버튼/포인트) - 아래로 붙이기 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
        }}
      >
        <span style={{ fontSize: "14px", color: "#333" }}>{reward}p</span>
        <button
          style={{
            backgroundColor: "#FFD858",
            border: "none",
            borderRadius: "20px",
            padding: "6px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default MissionCard;
