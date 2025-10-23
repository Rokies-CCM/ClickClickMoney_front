// src/pages/PointPage.jsx
import { useEffect, useState } from "react";

const WALLET_KEY = "points_wallet_v1";

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
  const [loaded, setLoaded] = useState(false); // 초기 저장 경합 방지

  // 교환 모달 상태
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(20);

  // 교환 완료 모달 상태
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [exchangedAmount, setExchangedAmount] = useState(0);

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

  // 교환 모달 열기/닫기
  const openExchange = () => {
    // 기본값: 20p, 보유 포인트보다 크면 보유 포인트로
    setExchangeAmount(Math.min(20, Math.max(0, points.current)));
    setIsExchangeOpen(true);
  };
  const closeExchange = () => setIsExchangeOpen(false);

  // 교환 확정 -> 완료 모달
  const confirmExchange = () => {
    const amt = Math.floor(Number(exchangeAmount) || 0);
    if (amt <= 0 || amt > points.current) return; // 버튼 disabled라 보통 안 옴

    const today = new Date().toISOString().split("T")[0];

    setPoints((prev) => ({
      ...prev,
      current: prev.current - amt,
      totalUsed: prev.totalUsed + amt,
    }));
    setHistory((prev) => [
      ...prev,
      { date: today, desc: "포인트 교환", change: `-${amt}p`, amount: `-${amt}` },
    ]);

    setExchangedAmount(amt);
    closeExchange();
    setIsSuccessOpen(true); // ✅ alert 대신 완료 모달
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
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          포인트
        </h1>
        <p style={{ color: "#555", fontSize: 15 }}>
          포인트를 관리하고 교환하세요.
        </p>
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
          <h3 style={{ fontSize: 26, fontWeight: 800 }}>
            {points.totalEarned}p
          </h3>
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
          <h3 style={{ fontSize: 26, fontWeight: 800 }}>
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
          borderRadius: 12,
          padding: "22px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            포인트 교환
          </h3>
          <p style={{ fontSize: 14, color: "#555" }}>
            교환 가능한 포인트: {points.current}p
          </p>
        </div>
        <button onClick={openExchange} style={btnPrimary}>
          교환하기
        </button>
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
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
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

      {/* === 교환 모달 === */}
      {isExchangeOpen && (
        <ExchangeModal
          current={points.current}
          amount={exchangeAmount}
          setAmount={setExchangeAmount}
          onClose={closeExchange}
          onConfirm={confirmExchange}
        />
      )}

      {/* ✅ 교환 완료 모달 */}
      {isSuccessOpen && (
        <ExchangeSuccessModal
          amount={exchangedAmount}
          onClose={() => setIsSuccessOpen(false)}
        />
      )}
    </section>
  );
}

/* ---------------- 교환 모달 ---------------- */
function ExchangeModal({ current, amount, setAmount, onClose, onConfirm }) {
  const btnPrimary = {
    backgroundColor: "#FFD858",
    border: "1px solid #000",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: 700,
    cursor: "pointer",
  };
  const btnText = {
    background: "transparent",
    border: "none",
    marginLeft: 10,
    cursor: "pointer",
    fontWeight: 600,
  };

  const clamp = (v) => {
    const n = Math.floor(Number(v) || 0);
    if (n < 0) return 0;
    if (n > current) return current;
    return n;
  };

  const quick = (v) => setAmount(clamp(v));
  const onInput = (e) => setAmount(clamp(e.target.value));

  const disabled = amount <= 0 || amount > current;

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
          padding: "40px 60px",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
          minWidth: 420,
          maxWidth: 520,
          width: "calc(100vw - 32px)",
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

        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>포인트 교환</h3>
        <p style={{ color: "#555", marginBottom: 16 }}>
          교환 가능한 포인트: <b>{current}p</b>
        </p>

        {/* 금액 입력 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          <input
            type="number"
            value={amount}
            onChange={onInput}
            min={0}
            max={current}
            step={1}
            style={{
              width: 160,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              textAlign: "right",
              fontSize: 16,
            }}
          />
          <span style={{ alignSelf: "center", fontWeight: 700 }}>p</span>
        </div>

        {/* 빠른 선택 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {[10, 20, 50].map((v) => (
            <button
              key={v}
              onClick={() => quick(v)}
              style={{
                background: "#fff",
                border: "1px solid #000",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v}p
            </button>
          ))}
          <button
            onClick={() => quick(current)}
            style={{
              background: "#fff",
              border: "1px solid #000",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            전부
          </button>
        </div>

        {/* 안내/에러 */}
        {disabled && (
          <p style={{ color: "#c92a2a", fontSize: 12, marginBottom: 8 }}>
            {amount <= 0 ? "1p 이상 입력해 주세요." : "보유 포인트를 초과했습니다."}
          </p>
        )}

        {/* 액션 */}
        <div>
          <button
            onClick={onConfirm}
            disabled={disabled}
            style={{
              ...btnPrimary,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            교환하기
          </button>
          <button onClick={onClose} style={btnText}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------- 교환 완료 모달 -------------- */
function ExchangeSuccessModal({ amount, onClose }) {
  const btnPrimary = {
    backgroundColor: "#FFD858",
    border: "none",              // 깔끔한 노란 버튼 (로그아웃 모달과 톤 매칭)
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
          width: 360,
          maxWidth: "90vw",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "left",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>교환 완료</h3>
        <p style={{ margin: "10px 0 0", color: "#333", lineHeight: 1.5 }}>
          {amount}p를 성공적으로 교환했습니다.
        </p>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={btnPrimary} onClick={onClose}>확인</button>
          <button style={btnText} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}