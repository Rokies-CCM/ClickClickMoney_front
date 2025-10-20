const BudgetCard = ({ data }) => {
  const { used, total } = data;
  const percent = total ? Math.round((used / total) * 100) : 0;

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
      }}
      onMouseEnter={(e) => onHover(e, true)}
      onMouseLeave={(e) => onHover(e, false)}
    >
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "10px" }}>
        이번 달 예산
      </h3>
      <p
        style={{
          color: "#FFD858",
          fontSize: "28px",
          fontWeight: 700,
          margin: "10px 0",
        }}
      >
        {percent}%
      </p>
      <p style={{ color: "#555", fontSize: "14px", marginBottom: "10px" }}>
        사용률
      </p>

      {/* 진행바 */}
      <div
        style={{
          backgroundColor: "#ddd",
          height: "8px",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            backgroundColor: "#000",
          }}
        ></div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          color: "#555",
        }}
      >
        <span>지출 {used.toLocaleString()}원</span>
        <span>예산 {total.toLocaleString()}원</span>
      </div>
    </div>
  );
};

export default BudgetCard;
