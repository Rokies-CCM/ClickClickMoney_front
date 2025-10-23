// src/pages/PointPage.jsx
import { useEffect, useState } from "react";
import { getMyPoints, getMyPointTx, redeemPoints, playCatalogLottery } from "../api/points"; // ✅ 서버 포인트 API(+ 카탈로그 복권)
import { me } from "../api/auth"; // ✅ 사용자별 브리지 키 분리

// ✅ 리워드 카탈로그
const REWARDS = [
  { id: "lottery-pass", name: "복권 긁기 이용권", price: 50, desc: "지금 바로 긁어서 당첨 포인트를 받아보세요!" },
  { id: "conv-500",     name: "편의점 500원 할인권", price: 500,  desc: "편의점에서 500원 할인(예시)." },
  { id: "icecream",     name: "아이스크림 교환권",   price: 1000, desc: "일부 매장 제외(예시)." },
  { id: "delivery-2k",  name: "배달비 2,000원 할인", price: 2000, desc: "배달앱 쿠폰(예시)." },
  { id: "coffee-ame",   name: "커피 쿠폰(아메리카노)", price: 4500, desc: "스타벅스/투썸 등(예시)." },
  { id: "movie",        name: "영화 예매권",         price: 9000, desc: "일반 2D 기준(예시)." },
];

const labelFromReason = (value) => {
  const key = String(value ?? "").toUpperCase();

  switch (key) {
    // 일반 미션류는 전부 "미션 완료 보상"으로
    case "MISSION_REWARD":
    case "QUIZ":
    case "VISIT":
    case "BUDGET":
    case "EXPENSE":
    case "EXCHANGE":
      return "미션 완료 보상";

    // 교환(차감)
    case "REDEEM":
      return "포인트 교환";

    // 복권 표기: 과거/현재 키 모두 대응
    case "LOTTERY_REWARD":
    case "LOTTERY_DAILY":
    case "LOTTERY":
      return "복권 당첨";

    default:
      // 폴백: 값 없으면 기본 문구, 있으면 언더스코어 → 공백
      if (!value) return "포인트 변경";
      return String(value).replace(/_/g, " ");
  }
};

// MissionPage와 상태 연동용 브리지
const BRIDGE_KEY = "mission_bridge_v1";
const todayStr = () => new Date().toISOString().split("T")[0];
const readBridge = (username) => {
  try {
    const raw = localStorage.getItem(`${BRIDGE_KEY}::${username || "guest"}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeBridge = (username, patch) => {
  try {
    const key = `${BRIDGE_KEY}::${username || "guest"}`;
    const prev = readBridge(username) || {};
    const next = {
      ...prev,
      date: todayStr(),
      ...patch, // {exchange:{...}} 또는 {lottery:{...}}
    };
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export default function PointPage() {
  const [username, setUsername] = useState("guest");

  const [points, setPoints] = useState({ current: 0, totalEarned: 0, totalUsed: 0 });
  const [history, setHistory] = useState([]);

  // 카탈로그 & 복권
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isRewardSuccessOpen, setIsRewardSuccessOpen] = useState(false);
  const [rewardItemName, setRewardItemName] = useState("");
  const [rewardSpent, setRewardSpent] = useState(0);

  const [isScratchOpen, setIsScratchOpen] = useState(false);
  const [scratchReward, setScratchReward] = useState(null); // null: 미긁음

  // 사용자 로드(브리지 키 사용자별 분리)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const name = await me();
        if (!alive) return;
        setUsername(name || "guest");
      } catch {
        if (!alive) return;
        setUsername("guest");
      }
    })();
    return () => { alive = false; };
  }, []);

  // ✅ 서버에서 요약 + 내역 조회
  async function refresh() {
    try {
      const summary = await getMyPoints(5); // {balance, totalEarned, totalSpent, recent:[...]}
      setPoints({
        current: Number(summary.balance || 0),
        totalEarned: Number(summary.totalEarned || 0),
        totalUsed: Number(summary.totalSpent || 0),
      });
    } catch (e) {
      console.warn("포인트 요약 조회 실패:", e);
      setPoints({ current: 0, totalEarned: 0, totalUsed: 0 });
    }

    try {
      const page = await getMyPointTx({ page: 0, size: 100 });
      const arr = Array.isArray(page?.content)
        ? page.content
        : Array.isArray(page)
        ? page
        : [];
      setHistory(
        arr.map((t) => ({
          date: (t.createdAt || "").slice(0, 10),
          desc: labelFromReason(t.reason),
          change: Number(t.delta) > 0 ? `+${Number(t.delta)}p` : `${Number(t.delta)}p`,
          amount: Number(t.delta),
        }))
      );
    } catch (e) {
      console.warn("포인트 내역 조회 실패:", e);
      setHistory([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // 창 포커스 시 자동 새로고침(다른 페이지에서 적립/차감 후 동기화)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // === 카탈로그 ===
  const openCatalog = () => setIsCatalogOpen(true);
  const closeCatalog = () => setIsCatalogOpen(false);

  // ✅ 리워드 교환(카탈로그) → 서버 차감 / 브리지(exchange) 신호 기록 / 복권이면 긁기 모달
  const redeemReward = async (item) => {
    if (!item) return;
    if (item.price > points.current) {
      alert("포인트가 부족합니다.");
      return;
    }
    try {
      await redeemPoints({ amount: item.price }); // 서버 차감
      // 교환 미션 브리지 신호 남기기(미션 탭에서 finalizeMission 트리거)
      writeBridge(username, {
        exchange: { done: true, synced: false },
      });

      await refresh();

      if (item.id === "lottery-pass") {
        // 복권 이용권이면: 차감 후 긁기 모달로
        setIsCatalogOpen(false);
        setScratchReward(null);
        setIsScratchOpen(true);
        return;
      }

      // 일반 리워드면: 완료 모달
      setRewardSpent(item.price);
      setRewardItemName(item.name);
      setIsCatalogOpen(false);
      setIsRewardSuccessOpen(true);
    } catch (e) {
      alert(e?.message || "리워드 교환에 실패했습니다.");
    }
  };

  // ✅ 카탈로그 복권 긁기(무제한) → 서버 전용 엔드포인트가 랜덤 보상 적립 후 {reward} 반환
  const handleScratch = async () => {
    if (scratchReward !== null) return; // 이미 긁음
    try {
      const res = await playCatalogLottery(); // e.g. POST /points/lottery/catalog/play
      const r = Number(res?.reward ?? 0);
      setScratchReward(r);

      // 복권 미션 브리지 신호 남기기(미션 탭 카드 완료 동기화 + 안내)
      writeBridge(username, {
        lottery: { done: true, reward: r, synced: false },
      });

      await refresh();
    } catch (e) {
      alert(e?.message || "복권 보상 지급에 실패했습니다.");
    }
  };

  // 스타일
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
          포인트를 관리하고 쿠폰/리워드로 교환하세요.
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

      {/* === 쿠폰/리워드 교환(카탈로그) === */}
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
            쿠폰/리워드 교환
          </h3>
          <p style={{ fontSize: 14, color: "#555" }}>
            교환 가능한 포인트: {points.current}p
          </p>
        </div>
        <button onClick={openCatalog} style={btnPrimary}>
          카탈로그 보기
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

      {/* === 모달들 === */}
      {/* 카탈로그 모달 */}
      {isCatalogOpen && (
        <RewardCatalogModal
          current={points.current}
          items={REWARDS}
          onClose={closeCatalog}
          onRedeem={redeemReward}
        />
      )}

      {/* 일반 리워드 교환 완료 */}
      {isRewardSuccessOpen && (
        <RewardSuccessModal
          amount={rewardSpent}
          itemName={rewardItemName}
          onClose={() => setIsRewardSuccessOpen(false)}
        />
      )}

      {/* ✅ 복권 긁기 모달 */}
      {isScratchOpen && (
        <ScratchModal
          reward={scratchReward}
          onScratch={handleScratch}
          onClose={() => {
            setIsScratchOpen(false);
            setScratchReward(null);
          }}
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

        <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>쿠폰/리워드 카탈로그</h3>
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
                  <h4 style={{ margin: "6px 0 6px", fontSize: 16, fontWeight: 800 }}>{it.name}</h4>
                  <p style={{ color: "#555", fontSize: 13, lineHeight: 1.4 }}>{it.desc}</p>
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

/* -------------- 리워드 교환 완료 모달(카탈로그) -------------- */
function RewardSuccessModal({ amount, itemName, onClose }) {
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
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={btnPrimary} onClick={onClose}>확인</button>
          <button style={btnText} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* -------------- ✅ 복권 긁기 모달 -------------- */
function ScratchModal({ reward, onScratch, onClose }) {
  const btnPrimary = {
    backgroundColor: "#FFD858",
    border: "1px solid #000",
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
        zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: "1px solid #000",
          borderRadius: 12,
          padding: 24,
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>복권 긁기</h3>
        <p style={{ marginTop: 8, color: "#555" }}>
          방금 교환한 <b>복권 긁기 이용권</b>을 사용해 보상을 받아보세요!
        </p>

        <div
          style={{
            margin: "16px auto 10px",
            border: "1px dashed #aaa",
            borderRadius: 12,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            userSelect: "none",
          }}
        >
          {reward === null ? "READY" : `${reward} p 당첨! 🎉`}
        </div>

        <div style={{ marginTop: 10 }}>
          {reward === null ? (
            <button onClick={onScratch} style={btnPrimary}>복권 긁기</button>
          ) : (
            <button onClick={onClose} style={btnPrimary}>확인</button>
          )}
          <button onClick={onClose} style={btnText}>닫기</button>
        </div>
      </div>
    </div>
  );
}
