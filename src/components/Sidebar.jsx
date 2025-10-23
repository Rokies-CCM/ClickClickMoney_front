const Sidebar = ({ isOpen, closeSidebar, go }) => {
  return (
    <>
      {/* ✅ 반투명 배경 (열렸을 때만 표시, 클릭 시 닫힘) */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 900,
          }}
        />
      )}

      {/* ✅ 사이드바 본체 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? "0" : "-300px", // 🔹 닫힐 때 완전히 밖으로 이동
          width: "250px",
          height: "100vh",
          backgroundColor: "#f4f4f4",
          borderRight: "1px solid #ccc",
          transition: "left 0.3s ease", // 🔹 부드러운 애니메이션
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px",
        }}
      >
        {/* 상단 로고 */}
        <h2
          onClick={closeSidebar} // 🔹 로고 클릭 시 닫기
          style={{
            fontWeight: 900,
            fontSize: "20px",
            marginBottom: "30px",
            cursor: "pointer",
          }}
        >
          click talk
        </h2>

        {/* 메뉴 목록 */}
        {[
          { name: "대시보드", path: "/wallet" },
          { name: "오늘의 미션", path: "/mission" },
          { name: "포인트", path: "/point" },
          { name: "가계부", path: "/account" },
          { name: "정기결제", path: "/subscription" },
          { name: "분석", path: "/analysis" },
          { name: "AI 코치", path: "/chat" },
          { name: "주식 현재가", path: "/stock-price" },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => {
              go(item.path);
              closeSidebar();
            }}
            style={{
              textAlign: "left",
              background: "none",
              border: "none",
              padding: "10px 0",
              cursor: "pointer",
              fontWeight: 600,
              color: "#000",
              fontSize: "15px",
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
    </>
  );
};

export default Sidebar;