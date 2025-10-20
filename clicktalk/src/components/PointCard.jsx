const PointCard = ({ data }) => {
  const { total, logs } = data;

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
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
        포인트 현황
      </h3>
      <div
        style={{
          backgroundColor: "#FFD858",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px",
        }}
      >
        <p style={{ fontSize: "14px", color: "#333" }}>보유 포인트</p>
        <h3
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginTop: "6px",
          }}
        >
          {total}p
        </h3>
      </div>

      <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
        최근 적립 내역
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {logs.map((log, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            <span>{log.label}</span>
            <span>+{log.value}p</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PointCard;
