import { useState, useEffect } from "react";

const PointPage = ({ earnedFromMission = 0 }) => {
  const [points, setPoints] = useState({
    current: 0,
    totalEarned: 0,
    totalUsed: 0,
  });

  const [history, setHistory] = useState([]);

  // ✅ 미션 포인트 추가
  useEffect(() => {
    if (earnedFromMission > 0) {
      setPoints((prev) => ({
        ...prev,
        current: prev.current + earnedFromMission,
        totalEarned: prev.totalEarned + earnedFromMission,
      }));
      setHistory((prev) => [
        ...prev,
        {
          date: new Date().toISOString().split("T")[0],
          desc: "미션 완료 보상",
          change: `+${earnedFromMission}p`,
          amount: `+${earnedFromMission}`,
        },
      ]);
    }
  }, [earnedFromMission]);

  // ✅ 포인트 교환
  const handleExchange = () => {
    if (points.current < 20) {
      alert("교환 가능한 포인트가 없습니다. (최소 20p 필요)");
      return;
    }

    setPoints((prev) => ({
      ...prev,
      current: prev.current - 20,
      totalUsed: prev.totalUsed + 20,
    }));

    setHistory((prev) => [
      ...prev,
      {
        date: new Date().toISOString().split("T")[0],
        desc: "포인트 교환",
        change: "-20p",
        amount: "-20",
      },
    ]);

    alert("20p를 교환했습니다!");
  };

  // ✅ 카드 hover 스타일
  const hoverStyle = {
    transform: "translateY(-5px)",
    boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
    transition: "all 0.25s ease",
  };

  const normalStyle = {
    transform: "translateY(0)",
    boxShadow: "none",
    transition: "all 0.25s ease",
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "50px 80px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* === 제목 === */}
      <div
        style={{
          marginBottom: "30px",
          width: "100%",
          maxWidth: "900px",
          textAlign: "left",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          포인트
        </h1>
        <p style={{ color: "#555", fontSize: "15px" }}>
          포인트를 관리하고 교환하세요.
        </p>
      </div>

      {/* === 포인트 카드 3개 === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          gap: "30px",
          marginBottom: "40px",
          flexWrap: "nowrap",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {/* 보유 포인트 */}
        <div
          style={{
            background: "#FFD858",
            borderRadius: "10px",
            padding: "20px 40px",
            flex: 1,
            boxShadow: "0 3px 0 rgba(0,0,0,0.15)",
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, hoverStyle)
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, normalStyle)
          }
        >
          <p
            style={{
              fontSize: "14px",
              color: "#000",
              fontWeight: 600,
              marginBottom: "6px",
              textAlign: "left", // 왼쪽 정렬
              marginLeft: "6px", // 살짝 왼쪽 여백 추가
            }}
          >
            보유 포인트
          </p>
          <h3
            style={{
              fontSize: "26px",
              fontWeight: 800,
              textAlign: "left", // 왼쪽 정렬
              marginLeft: "6px",
            }}
          >
            {points.current}p
          </h3>
        </div>

        {/* 총 적립 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "20px 40px",
            flex: 1,
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, hoverStyle)
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, normalStyle)
          }
        >
          <p
            style={{
              fontSize: "14px",
              color: "#555",
              marginBottom: "6px",
            }}
          >
            총 적립
          </p>
          <h3 style={{ fontSize: "26px", fontWeight: 800 }}>
            {points.totalEarned}p
          </h3>
        </div>

        {/* 총 사용 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "20px 40px",
            flex: 1,
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, hoverStyle)
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, normalStyle)
          }
        >
          <p
            style={{
              fontSize: "14px",
              color: "#555",
              marginBottom: "6px",
            }}
          >
            총 사용
          </p>
          <h3 style={{ fontSize: "26px", fontWeight: 800 }}>
            {points.totalUsed}p
          </h3>
        </div>
      </div>

      {/* === 포인트 교환 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1.5px solid #000",
          borderRadius: "12px",
          padding: "22px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
            포인트 교환
          </h3>
          <p style={{ fontSize: "14px", color: "#555" }}>
            교환 가능한 포인트: {points.current}p
          </p>
        </div>
        <button
          onClick={handleExchange}
          style={{
            backgroundColor: "#FFD858",
            border: "1.5px solid #000",
            borderRadius: "20px",
            padding: "8px 24px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          교환하기
        </button>
      </div>

      {/* === 포인트 내역 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1.5px solid #000",
          borderRadius: "12px",
          padding: "20px 28px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            fontSize: "17px",
            fontWeight: 700,
            marginBottom: "16px",
          }}
        >
          포인트 내역
        </h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1.5px solid #000",
                fontSize: "15px",
              }}
            >
              <th style={{ padding: "10px 8px" }}>날짜</th>
              <th style={{ padding: "10px 8px" }}>내용</th>
              <th style={{ padding: "10px 8px" }}>변동</th>
              <th style={{ padding: "10px 8px" }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>
                  포인트 내역이 없습니다.
                </td>
              </tr>
            ) : (
              history.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px 8px" }}>{item.date}</td>
                  <td style={{ padding: "10px 8px" }}>{item.desc}</td>
                  <td style={{ padding: "10px 8px" }}>{item.change}</td>
                  <td style={{ padding: "10px 8px" }}>{item.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PointPage;
