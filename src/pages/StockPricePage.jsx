// src/pages/StockPricePage.jsx
import { useEffect, useRef, useState } from "react";
import {
  fetchMarketCapTop,
  fetchTopVolume,
  getResolvedStockApiBase,
} from "../api/stock";

/* ===== 우측 오프셋 ===== */
const OFFSET_LEFT = 140;

/* ===== 스타일 ===== */
const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#fff",
  padding: "40px 60px",
  display: "flex",
  flexDirection: "column",
};
const containerStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};
const tabsWrapStyle = {
  display: "flex",
  gap: 12,
  margin: `0 0 20px ${OFFSET_LEFT}px`,
};
const pill = (active) => ({
  background: active ? "#000" : "rgba(0,0,0,0.06)",
  color: active ? "#fff" : "#000",
  border: "none",
  borderRadius: 999,
  padding: "10px 22px",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
});
const gridRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 20,
  marginBottom: 20,
};
const cardStyle = {
  border: "1.5px solid #000",
  borderRadius: 12,
  padding: "18px 16px",
  background: "#fff",
  transition: "transform .2s ease, box-shadow .2s ease",
};
const metaRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

/* ===== 유틸 ===== */
const formatNumber = (n) => (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR");
const changeChip = (change, rateRaw) => {
  const changeNum = Number(change) || 0;
  const rate = Number(rateRaw) || 0;
  const isUp = changeNum > 0;
  const isDown = changeNum < 0;
  const sign = isUp ? "▲" : isDown ? "▼" : "—";
  const color = isUp ? "#c92a2a" : isDown ? "#228be6" : "#333";
  return {
    text: `${sign} ${formatNumber(Math.abs(changeNum))} (${Math.abs(rate).toFixed(2)}%)`,
    style: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #000",
      background: "#FFD858",
      color,
      fontWeight: 800,
      fontSize: 12,
    },
  };
};

/* ===== 목데이터 ===== */
const makeMock = (seed = 0) => {
  const base = [
    ["삼성전자", "005930"],
    ["LG에너지솔루션", "373220"],
    ["NAVER", "035420"],
    ["카카오", "035720"],
    ["현대차", "005380"],
    ["기아", "000270"],
    ["POSCO홀딩스", "005490"],
    ["HMM", "011200"],
    ["셀트리온", "068270"],
    ["대한항공", "003490"],
  ];
  return base.map(([name, code], i) => {
    const rnd = ((i + 1) * (seed + 3)) % 7;
    const price = 10000 + (i + 1) * 257 + rnd * 300;
    const change = (rnd - 3) * 120;
    const rate = (change / Math.max(price, 1)) * 100;
    const volume = 100000 + rnd * 12345 + i * 5000;
    return { name, code, price, change, rate, volume };
  });
};

/* ===== FastAPI 응답 파싱 ===== */
const parseTopVolume = (body) => {
  const dataObj =
    typeof body === "string" ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : body || {};
  const list =
    dataObj?.output?.item_inq_rank ||
    dataObj?.item_inq_rank ||
    dataObj?.list ||
    dataObj?.items ||
    dataObj?.data ||
    [];
  return (Array.isArray(list) ? list : []).slice(0, 10).map((row, i) => {
    const toNum = (v) => Number(String(v ?? 0).replace(/[+,]/g, ""));
    return {
      name: row.stk_nm || row.name || `종목${i + 1}`,
      code: row.stk_cd || row.code || `CODE${i + 1}`,
      price: toNum(row.past_curr_prc ?? row.price),
      change: toNum(row.rank_chg ?? row.prdy_vrss),
      rate: Number(row.base_comp_chgr ?? row.prdy_ctrt ?? 0),
      volume: toNum(row.tr_quan ?? row.trd_qty),
    };
  });
};

const parseMarketCapList = (list) =>
  (Array.isArray(list) ? list.slice(0, 10) : []).map((row, i) => {
    const toNum = (v) => Number(String(v ?? 0).replace(/[+,]/g, ""));
    return {
      name: row.name || `종목${i + 1}`,
      code: row.code || `CODE${i + 1}`,
      price: toNum(row.price),
      change: toNum(row.change_price),
      rate: Number(row.change_rate ?? 0),
      volume: toNum(row.volume),
    };
  });

/* ===== 탭 ===== */
const TABS = ["실시간", "증권"];

export default function StockPricePage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [errorCount, setErrorCount] = useState(0); // 연속 실패 횟수 (429 방지)
  const [apiBaseShown, setApiBaseShown] = useState("");
  const intervalRef = useRef(null);
  const inFlightRef = useRef(false);

  const fetchStocksByTab = async (tab) => {
    if (tab === "실시간") {
      try {
        const { data, usedBase } = await fetchTopVolume({
          env: "real",
          market_type: "000",
          sort_type: "1",
        });
        setApiBaseShown(usedBase || getResolvedStockApiBase() || "");
        return parseTopVolume(data);
      } catch (e) {
        if (String(e?.message || "").includes("429")) {
          setErrorCount(99); // 자동 새로고침 중단
        }
        // mock 1회
        setApiBaseShown("(mock)");
        return makeMock(1);
      }
    } else {
      const { data, usedBase } = await fetchMarketCapTop(10, "real");
      setApiBaseShown(usedBase || getResolvedStockApiBase() || "");
      return parseMarketCapList(data);
    }
  };

  const load = async () => {
    if (inFlightRef.current) return; // 중복 요청 방지
    inFlightRef.current = true;

    setLoading(true);
    setErr("");
    try {
      const data = await fetchStocksByTab(activeTab);
      setItems((Array.isArray(data) ? data : []).slice(0, 10));
      setUpdatedAt(new Date());
      setErrorCount(0);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "데이터를 불러오지 못했어요.");
      setItems([]);
      setErrorCount((n) => Math.min(n + 1, 9));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  // 탭 변경/초기 로딩 + 자동 새로고침 제어
  useEffect(() => {
    load();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeTab === "실시간" && errorCount < 2) {
      intervalRef.current = setInterval(load, 10_000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 실패 횟수 변경 시 자동 새로고침 on/off 업데이트
  useEffect(() => {
    if (activeTab !== "실시간") return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (errorCount < 2) {
      intervalRef.current = setInterval(load, 10_000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorCount]);

  const list = (loading ? makeMock(0) : items).slice(0, 10);
  const row1 = list.slice(0, 5);
  const row2 = list.slice(5, 10);

  return (
    <section style={pageStyle}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 8,
            marginLeft: OFFSET_LEFT,
          }}
        >
          주식 / 증권
        </h1>
        <p style={{ color: "#555", fontSize: 15, marginLeft: OFFSET_LEFT }}>
          주요 종목 시세를 카드로 간결하게 확인해 보세요.
        </p>
      </div>

      {/* 탭 */}
      <div style={tabsWrapStyle} role="tablist" aria-label="Stock tabs">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            aria-current={activeTab === t ? "page" : undefined}
            onClick={() => setActiveTab(t)}
            style={pill(activeTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 툴바 */}
      <div
        style={{
          ...containerStyle,
          marginLeft: OFFSET_LEFT,
          marginRight: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <p style={{ fontSize: 13, color: "#666" }}>
          {loading
            ? "데이터 로딩 중…"
            : updatedAt
            ? `최근 업데이트: ${updatedAt.toLocaleTimeString("ko-KR")}`
            : ""}
          {activeTab === "실시간" && errorCount >= 2
            ? " (오류가 반복되어 자동 새로고침을 일시 중지했어요)"
            : ""}
        </p>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 14px",
            border: "1.5px solid #000",
            borderRadius: 10,
            background: "#FFD858",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "새로고침…" : "⟳ 새로고침"}
        </button>
      </div>

      {/* 카드 5×2 */}
      <div style={{ ...containerStyle, marginTop: 8 }}>
        {err ? (
          <div
            style={{
              border: "1.5px solid #000",
              borderRadius: 12,
              padding: 18,
              color: "#c92a2a",
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : (
          <>
            {[row1, row2].map((row, ri) => (
              <div key={ri} style={gridRowStyle}>
                {row.map((s, idx) => {
                  const chip = changeChip(s.change, s.rate);
                  return (
                    <article
                      key={`${s.code}-${idx}`}
                      style={cardStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 12px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={metaRowStyle}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>
                            {s.name}
                          </div>
                          <div style={{ color: "#888", fontSize: 12 }}>
                            ({s.code})
                          </div>
                        </div>
                        <span style={chip.style}>{chip.text}</span>
                      </div>

                      <div style={{ textAlign: "left", marginTop: 10 }}>
                        <div
                          style={{ fontSize: 14, color: "#666", marginBottom: 6 }}
                        >
                          현재가
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>
                          {formatNumber(s.price)}원
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 13,
                            color: "#444",
                          }}
                        >
                          <span>거래량</span>
                          <strong>{formatNumber(s.volume)}</strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {Array.from({ length: Math.max(0, 5 - row.length) }).map((_, i) => (
                  <div key={`placeholder-${ri}-${i}`} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* 사용된 프록시 베이스 안내 */}
      <div style={{ ...containerStyle, marginTop: 18 }}>
        <p style={{ fontSize: 12, color: "#999" }}>
          API Base: <code>{apiBaseShown || getResolvedStockApiBase() || "(auto)"}</code>
        </p>
      </div>
    </section>
  );
}
