// src/pages/PointPage.jsx
import { useEffect, useState } from "react";

const WALLET_KEY = "points_wallet_v1";

// ✅ 리워드 카탈로그(원하는 대로 추가/수정 가능)
const REWARDS = [
  { id: "lottery-pass", name: "복권 긁기 이용권", price: 50, desc: "미션 > 복권 긁기에서 즐겨 보세요." },
  { id: "conv-500", name: "편의점 500원 할인권", price: 500, desc: "편의점에서 500원 할인(예시)." },
  { id: "icecream", name: "아이스크림 교환권", price: 1000, desc: "일부 매장 제외(예시)." },
  { id: "delivery-2k", name: "배달비 2,000원 할인", price: 2000, desc: "배달앱 쿠폰(예시)." },
  { id: "coffee-ame", name: "커피 쿠폰(아메리카노)", price: 4500, desc: "스타벅스/투썸 등(예시)." },
  { id: "movie", name: "영화 예매권", price: 9000, desc: "일반 2D 기준(예시)." },
];

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

export default function PointPage() {
  const [points, setPoints] = useState({
    current: 0,
    totalEarned: 0,
    totalUsed: 0,
  });
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // 🔄 카탈로그 모달
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // ✅ 교환 완료 모달
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [exchangedAmount, setExchangedAmount] = useState(0);
  const [exchangedItemName, setExchangedItemName] = useState("");

  // 지갑 로드
  useEffect(() => {
    const w = loadWalletSafely();
    setPoints({ current: w.current, totalEarned: w.totalEarned, totalUsed: w.totalUsed });
    setHistory(w.history);
    setLoaded(true);
  }, []);

  // 포커스 시 최신 지갑 반영
  useEffect(() => {
    const onFocus = () => {
      const w = loadWalletSafely();
      setPoints({ current: w.current, totalEarned: w.totalEarned, totalUsed: w.totalUsed });
      setHistory(w.history);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // 지갑 저장 (로드 끝난 뒤에만)
  useEffect(() => {
    if (!loaded) return;
    try {
      const next = { ...points, history };
      localStorage.setItem(WALLET_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save wallet", e);
    }
  }, [points, history, loaded]);

  // Hover styles + 버튼 스타일
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
  const btnPrimary = {
    backgroundColor: "#FFD858",
    border: "1.5px solid #000",
    borderRadius: "20px",
    padding: "8px 24px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  };

  // 카탈로그 열기/닫기
  const openCatalog = () => setIsCatalogOpen(true);
  const closeCatalog = () => setIsCatalogOpen(false);

  // ✅ 리워드 교환 처리
  const redeemReward = (item) => {
    if (!item) return;
    if (item.price > points.current) return; // 방어

    const today = new Date().toISOString().split("T")[0];

    setPoints((prev) => ({
      ...prev,
      current: prev.current - item.price,
      totalUsed: prev.totalUsed + item.price,
    }));
    setHistory((prev) => [
      ...prev,
      {
        date: today,
        desc: `쿠폰 교환: ${item.name}`,
        change: `-${item.price}p`,
        amount: `-${item.price}`,
      },
    ]);

    setExchangedAmount(item.price);
    setExchangedItemName(item.name);
    closeCatalog();
    setIsSuccessOpen(true);
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
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>포인트</h1>
        <p style={{ color: "#555", fontSize: 15 }}>포인트를 관리하고 교환하세요.</p>
      </div>

      {/* === 포인트 카드 3개 === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          gap: 30,
          marginBottom: 40,
          flexWrap: "nowrap",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {/* 보유 포인트 */}
        <div
          style={{
            background: "#FFD858",
            borderRadius: 10,
            padding: "20px 40px",
            flex: 1,
            boxShadow: "0 3px 0 rgba(0,0,0,0.15)",
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, normalStyle)}
        >
          <p
            style={{
              fontSize: 14,
              color: "#000",
              fontWeight: 600,
              marginBottom: 6,
              textAlign: "left",
              marginLeft: 6,
            }}
          >
            보유 포인트
          </p>
          <h3
            style={{
              fontSize: 26,
              fontWeight: 800,
              textAlign: "left",
              marginLeft: 6,
            }}
          >
            {points.current}p
          </h3>
        </div>

        {/* 총 적립 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: 10,
            padding: "20px 40px",
            flex: 1,
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, normalStyle)}
        >
          <p style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>총 적립</p>
          <h3 style={{ fontSize: 26, fontWeight: 800 }}>{points.totalEarned}p</h3>
        </div>

        {/* 총 사용 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: 10,
            padding: "20px 40px",
            flex: 1,
            cursor: "pointer",
            ...normalStyle,
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, normalStyle)}
        >
          <p style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>총 사용</p>
          <h3 style={{ fontSize: 26, fontWeight: 800 }}>{points.totalUsed}p</h3>
        </div>
      </div>

      {/* === 쿠폰/리워드 교환 영역 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1.5px solid #000",
          borderRadius: 12,
          padding: "22px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>쿠폰/리워드 교환</h3>
          <p style={{ fontSize: 14, color: "#555" }}>
            교환 가능한 포인트: {points.current}p
          </p>
        </div>
        <button onClick={openCatalog} style={btnPrimary}>카탈로그 보기</button>
      </div>

      {/* === 포인트 내역 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          border: "1.5px solid #000",
          borderRadius: 12,
          padding: "20px 28px",
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>포인트 내역</h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1.5px solid #000", fontSize: 15 }}>
              <th style={{ padding: "10px 8px" }}>날짜</th>
              <th style={{ padding: "10px 8px" }}>내용</th>
              <th style={{ padding: "10px 8px" }}>변동</th>
              <th style={{ padding: "10px 8px" }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: 16 }}>
                  포인트 내역이 없습니다.
                </td>
              </tr>
            ) : (
              history
                .slice()
                .reverse()
                .map((item, idx) => (
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

      {/* === 카탈로그 모달 === */}
      {isCatalogOpen && (
        <RewardCatalogModal
          current={points.current}
          items={REWARDS}
          onClose={closeCatalog}
          onRedeem={redeemReward}
        />
      )}

      {/* ✅ 교환 완료 모달 */}
      {isSuccessOpen && (
        <ExchangeSuccessModal
          amount={exchangedAmount}
          itemName={exchangedItemName}
          onClose={() => setIsSuccessOpen(false)}
        />
      )}
    </section>
  );
}

/* ---------------- 리워드 카탈로그 모달 ---------------- */
function RewardCatalogModal({ current, items, onClose, onRedeem }) {
  const btnText = {
    background: "transparent",
    border: "none",
    marginLeft: 10,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          padding: "28px 28px 32px",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          width: "min(900px, 96vw)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          aria-label="닫기"
          title="닫기"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#fff",
            border: "1px solid #000",
            cursor: "pointer",
            lineHeight: "30px",
            fontSize: 16,
          }}
        >
          ✕
        </button>

        <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
          쿠폰/리워드 카탈로그
        </h3>
        <p style={{ color: "#555", marginBottom: 16 }}>
          보유 포인트: <b>{current}p</b>
        </p>

        {/* 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((it) => {
            const disabled = it.price > current;
            return (
              <div
                key={it.id}
                style={{
                  border: "1px solid #000",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 160,
                  background: "#fff",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: 12,
                      fontWeight: 800,
                      background: "#FFD858",
                      border: "1px solid #000",
                      borderRadius: 10,
                      padding: "2px 8px",
                      marginBottom: 8,
                    }}
                  >
                    {it.price}p
                  </div>
                  <h4 style={{ margin: "6px 0 6px", fontSize: 16, fontWeight: 800 }}>
                    {it.name}
                  </h4>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.4 }}>
                    {it.desc}
                  </p>
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => onRedeem?.(it)}
                    disabled={disabled}
                    style={{
                      backgroundColor: "#000",
                      color: "#fff",
                      border: "1px solid #000",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      width: "100%",
                      opacity: disabled ? 0.35 : 1,
                    }}
                    title={disabled ? "포인트가 부족합니다." : "교환하기"}
                  >
                    {disabled ? "포인트 부족" : "교환하기"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button onClick={onClose} style={btnText}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* -------------- 교환 완료 모달 -------------- */
function ExchangeSuccessModal({ amount, itemName, onClose }) {
  const btnPrimary = {
    backgroundColor: "#FFD858",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontWeight: 800,
    cursor: "pointer",
  };
  const btnText = {
    background: "transparent",
    border: "none",
    marginLeft: 10,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: "1px solid #000",
          borderRadius: 12,
          padding: 20,
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "left",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>교환 완료</h3>
        <p style={{ margin: "10px 0 0", color: "#333", lineHeight: 1.6 }}>
          <b>{itemName}</b>을(를) {amount}p로 교환했습니다.
        </p>
        {/* 실제 서비스라면 쿠폰코드/유효기간 등을 여기 표기 */}
        {itemName === "복권 긁기 이용권" && (
          <p style={{ margin: "6px 0 0", color: "#666", fontSize: 13 }}>
            팁: 미션 페이지의 <b>복권 긁기</b>에서 오늘의 행운을 확인해 보세요!
          </p>
        )}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={btnPrimary} onClick={onClose}>확인</button>
          <button style={btnText} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
