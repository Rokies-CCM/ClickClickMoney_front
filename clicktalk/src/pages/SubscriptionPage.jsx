import { useState } from "react";

const SubscriptionPage = () => {
  const [subscriptions, setSubscriptions] = useState([
    {
      name: "넷플릭스",
      price: 17000,
      nextPayment: "2025-11-05",
      category: "엔터테인먼트",
    },
    {
      name: "유튜브 프리미엄",
      price: 10900,
      nextPayment: "2025-11-10",
      category: "엔터테인먼트",
    },
    {
      name: "노션 플러스",
      price: 6000,
      nextPayment: "2025-11-02",
      category: "생산성",
    },
  ]);

  const totalPayment = subscriptions.reduce((sum, s) => sum + s.price, 0);

  return (
    <section
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "50px 0",
        display: "flex",
        justifyContent: "center",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "950px",
          padding: "0 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* === 제목 === */}
        <div style={{ marginBottom: "30px", textAlign: "left" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            정기 결제
          </h1>
          <p style={{ color: "#555", fontSize: "15px" }}>
            구독 서비스를 관리하고 비용을 절감하세요.
          </p>
        </div>

        {/* === 상단 요약 카드 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
            }}
          >
            <p style={{ fontWeight: 700 }}>월 총 결제액</p>
            <p style={{ color: "#FF9900", fontWeight: 700, fontSize: "18px" }}>
              {totalPayment.toLocaleString()}원
            </p>
            <p style={{ color: "#888", fontSize: "13px" }}>
              총 {subscriptions.length}건
            </p>
          </div>
          <div
            style={{
              flex: 1,
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
            }}
          >
            <p style={{ fontWeight: 700 }}>활성 구독</p>
            <p style={{ color: "#000", fontWeight: 700, fontSize: "18px" }}>
              {subscriptions.length}개
            </p>
            <p style={{ color: "#888", fontSize: "13px" }}>현재 이용 중</p>
          </div>
          <div
            style={{
              flex: 1,
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
            }}
          >
            <p style={{ fontWeight: 700 }}>절감 가능액</p>
            <p style={{ color: "#FF9900", fontWeight: 700, fontSize: "18px" }}>
              15,000원
            </p>
            <p style={{ color: "#888", fontSize: "13px" }}>AI 예측 기준</p>
          </div>
        </div>

        {/* === 중복 구독 알림 === */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "24px 30px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            중복 구독 발견
          </h3>
          <p style={{ color: "#555", fontSize: "14px" }}>
            스포티파이와 애플 뮤직이 모두 활성화되어 있습니다. 하나를 해지하면
            매달 약 10,000원을 절약할 수 있습니다.
          </p>
        </div>

        {/* === 유휴 구독 알림 === */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "24px 30px",
            marginBottom: "30px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            유휴 구독 감지
          </h3>
          <p style={{ color: "#555", fontSize: "14px" }}>
            노션 플러스는 최근 30일간 사용하지 않았습니다. 해지를 고려해보세요.
          </p>
        </div>

        {/* === 구독 목록 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ fontSize: "17px", fontWeight: 700 }}>구독 목록</h3>
          <button
            style={{
              backgroundColor: "#FFD858",
              border: "1px solid #000",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + 추가
          </button>
        </div>

        {/* === 구독 카드 목록 === */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {subscriptions.map((s, i) => (
            <div
              key={i}
              style={{
                border: "1.5px solid #000",
                borderRadius: "10px",
                padding: "20px 24px",
                backgroundColor: "#fff",
                boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h4 style={{ fontWeight: 700, fontSize: "16px" }}>{s.name}</h4>
                <span
                  style={{
                    fontSize: "12px",
                    backgroundColor: "#FFD858",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: "1px solid #000",
                    fontWeight: 600,
                  }}
                >
                  {s.category}
                </span>
              </div>
              <p style={{ color: "#333", marginBottom: "4px", fontSize: "14px" }}>
                다음 결제일: <b>{s.nextPayment}</b>
              </p>
              <p
                style={{
                  fontWeight: 700,
                  color: "#E85A00",
                  fontSize: "15px",
                  marginTop: "6px",
                }}
              >
                {s.price.toLocaleString()}원 / 월
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionPage;
