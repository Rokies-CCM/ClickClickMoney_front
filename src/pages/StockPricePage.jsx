import { useEffect, useState, useRef } from "react";
import {
  fetchMarketCapTop,
  fetchTopVolume,
  getResolvedStockApiBase,
} from "../api/stock";

/* ===== 상수 ===== */
const MAX_CARDS = 12; // 항상 12개 고정

/* ===== 공용 스타일 ===== */
const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#fff",
  padding: "40px 60px",
  display: "flex",
  flexDirection: "column",
};
const containerStyle = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
};
const headerTitle = {
  fontSize: 32,
  fontWeight: 800,
  marginBottom: 8,
};
const headerDesc = {
  color: "#555",
  fontSize: 15,
};

/* ===== 상단 바 (탭 + 새로고침) ===== */
const topBarStyle = (isNarrow) => ({
  ...containerStyle,
  display: "grid",
  gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
  alignItems: "center",
  gap: 10,
  margin: "12px auto 12px",
});
const tabsWrapStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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
const rightWrap = (isNarrow) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifySelf: isNarrow ? "start" : "end",
});
const refreshBtn = (loading) => ({
  padding: "8px 14px",
  border: "1.5px solid #000",
  borderRadius: 10,
  background: "#FFD858",
  fontWeight: 800,
  cursor: loading ? "not-allowed" : "pointer",
});

/* ===== 그리드 & 카드 ===== */
const gridWrap = (cols) => ({
  ...containerStyle,
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(320px, 1fr))`, // 데스크톱은 3열
  gap: 24,
  marginTop: 10,
});
const cardStyle = {
  border: "1.5px solid #000",
  borderRadius: 16,
  padding: "20px 18px",
  background: "#fff",
  transition: "transform .2s ease, box-shadow .2s ease",
};
const metaRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
};
const nameWrap = { textAlign: "left", maxWidth: "72%" };
const nameStyle = {
  fontWeight: 800,
  fontSize: 17,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: "1.25",
};
const codeStyle = { color: "#888", fontSize: 12, marginTop: 3 };
const chipBase = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #000",
  background: "#FFD858",
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
};
const sectionLabel = { fontSize: 14, color: "#666", marginBottom: 6 };
const priceStyle = { fontSize: 24, fontWeight: 900 };
const rowKV = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  color: "#444",
};

/* ===== 유틸 ===== */
const formatNumber = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR");
const changeChip = (change, rateRaw) => {
  const changeNum = Number(change) || 0;
  const rate = Number(rateRaw) || 0;
  const isUp = changeNum > 0;
  const isDown = changeNum < 0;
  const sign = isUp ? "▲" : isDown ? "▼" : "—";
  const color = isUp ? "#c92a2a" : isDown ? "#228be6" : "#333";
  return {
    text: `${sign} ${formatNumber(Math.abs(changeNum))} (${Math.abs(rate).toFixed(2)}%)`,
    style: { ...chipBase, color },
  };
};

/* ===== 응답 파싱 ===== */
const parseTopVolume = (body) => {
  const safeParse = (b) =>
    typeof b === "string" ? (() => { try { return JSON.parse(b); } catch { return {}; } })() : b || {};
  const dataObj = safeParse(body);

  const pickFirstArray = (obj) => {
    const seen = new Set();
    const q = [obj];
    while (q.length) {
      const cur = q.shift();
      if (!cur || typeof cur !== "object") continue;
      for (const v of Object.values(cur)) {
        if (Array.isArray(v) && v.length) return v;
        if (v && typeof v === "object" && !seen.has(v)) { seen.add(v); q.push(v); }
      }
    }
    return [];
  };

  const list =
    dataObj?.output?.item_inq_rank ||
    dataObj?.output1?.item_inq_rank ||
    dataObj?.output2?.item_inq_rank ||
    dataObj?.output?.list ||
    dataObj?.output1?.list ||
    dataObj?.item_inq_rank ||
    dataObj?.list ||
    dataObj?.items ||
    dataObj?.data ||
    pickFirstArray(dataObj);

  const toNum = (v) => Number(String(v ?? 0).replace(/[+,]/g, ""));
  const toRate = (v) => Number(String(v ?? 0).replace("%", ""));
  const arr = Array.isArray(list) ? list : [];

  return arr.map((row, i) => {
    const code = row.stk_cd || row.code || row.mksc_shrn_iscd || row.stck_shrn_iscd || `CODE${i + 1}`;
    const name = row.stk_nm || row.name || row.hts_kor_isnm || row.isu_abbrv || `종목${i + 1}`;
    const price = toNum(row.stck_prpr ?? row.prpr ?? row.curr_prc ?? row.past_curr_prc ?? row.price);
    const change = toNum(row.prdy_vrss ?? row.prdy_vs ?? row.diff ?? row.cmpprevdd_prc);
    const rate = toRate(row.prdy_ctrt ?? row.base_comp_chgr ?? row.rate ?? row.cmpprevdd_rate);
    const volume = toNum(row.acml_vol ?? row.trd_qty ?? row.tr_quan ?? row.vol);
    return { name, code, price, change, rate, volume };
  });
};

const parseMarketCapList = (list) =>
  (Array.isArray(list) ? list : []).map((row, i) => {
    const toNum = (v) => Number(String(v ?? 0).replace(/[+,]/g, ""));
    return {
      name: row.name || row.stk_nm || `종목${i + 1}`,
      code: row.code || row.stk_cd || `CODE${i + 1}`,
      price: toNum(row.price ?? row.stck_prpr ?? row.prpr),
      change: toNum(row.change_price ?? row.prdy_vrss ?? row.diff),
      rate: Number((row.change_rate ?? row.prdy_ctrt ?? row.rate ?? 0).toString().replace("%", "")),
      volume: toNum(row.volume ?? row.acml_vol ?? row.trd_qty),
    };
  });

/* ===== 탭 ===== */
const TABS = ["실시간", "거래량"];

export default function StockPricePage() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("stock_active_tab") || TABS[0]
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [apiBaseShown, setApiBaseShown] = useState("");
  const inFlightRef = useRef(false);

  // 데스크톱 3열, 태블릿 2열, 모바일 1열
  const [cols, setCols] = useState(3);
  const [isNarrow, setIsNarrow] = useState(false); // 상단 바 배치
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w >= 1100) { setCols(3); setIsNarrow(false); }
      else if (w >= 760) { setCols(2); setIsNarrow(false); }
      else { setCols(1); setIsNarrow(true); }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("stock_active_tab", activeTab);
  }, [activeTab]);

  const fetchStocksByTab = async (tab) => {
    if (tab === "실시간") {
      const { data, usedBase } = await fetchTopVolume({
        env: "real",
        market_type: "000",
        sort_type: "1",
      });
      setApiBaseShown(usedBase || getResolvedStockApiBase() || "");
      return parseTopVolume(data);
    } else {
      const { data, usedBase } = await fetchMarketCapTop(MAX_CARDS, "real");
      setApiBaseShown(usedBase || getResolvedStockApiBase() || "");
      return parseMarketCapList(data);
    }
  };

  const load = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErr("");
    try {
      const data = await fetchStocksByTab(activeTab);
      // 항상 12개로 맞춤(부족하면 있는 만큼만 표시)
      setItems((Array.isArray(data) ? data : []).slice(0, MAX_CARDS));
      setUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
      setErr(e?.message || "데이터를 불러오지 못했어요.");
      setItems([]);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <section style={pageStyle}>
      {/* 헤더: 탭과 같은 컨테이너 왼쪽 기준 */}
      <div style={{ ...containerStyle, marginBottom: 8 }}>
        <h1 style={headerTitle}>주식 / 증권</h1>
        <p style={headerDesc}>주요 종목 시세를 카드로 간결하게 확인해 보세요.</p>
      </div>

      {/* 탭 + 새로고침 (Grid 배치) */}
      <div style={topBarStyle(isNarrow)}>
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

        <div style={rightWrap(isNarrow)}>
          <span style={{ fontSize: 12, color: "#666" }}>
            {loading ? "로딩 중…" : updatedAt ? `최근 업데이트: ${updatedAt.toLocaleTimeString("ko-KR")}` : ""}
          </span>
          {!isNarrow && (
            <button onClick={load} disabled={loading} style={refreshBtn(loading)}>
              {loading ? "새로고침…" : "⟳ 새로고침"}
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드: 항상 12개 */}
      <div style={gridWrap(cols)}>
        {err ? (
          <div
            style={{
              gridColumn: `1 / span ${cols}`,
              border: "1.5px solid #000",
              borderRadius: 12,
              padding: 18,
              color: "#c92a2a",
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : loading ? (
          Array.from({ length: MAX_CARDS }).map((_, idx) => (
            <article
              key={`skeleton-${idx}`}
              style={{
                ...cardStyle,
                background: "linear-gradient(90deg, #f4f4f4 25%, #eee 37%, #f4f4f4 63%)",
                backgroundSize: "400% 100%",
                animation: "pulse 1.4s ease infinite",
                height: 160,
              }}
            />
          ))
        ) : (
          items.map((s, idx) => {
            const chip = changeChip(s.change, s.rate);
            return (
              <article
                key={`${s.code}-${idx}`}
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={metaRowStyle}>
                  <div style={nameWrap}>
                    <div style={nameStyle}>{s.name}</div>
                    <div style={codeStyle}>({s.code})</div>
                  </div>
                  <span style={chip.style}>{chip.text}</span>
                </div>

                <div style={{ textAlign: "left", marginTop: 6 }}>
                  <div style={sectionLabel}>현재가</div>
                  <div style={priceStyle}>{formatNumber(s.price)}원</div>

                  <div style={rowKV}>
                    <span>거래량</span>
                    <strong>{formatNumber(s.volume)}</strong>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 아주 좁을 때만 플로팅 새로고침 버튼 */}
      {isNarrow && (
        <button
          onClick={load}
          disabled={loading}
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            padding: "12px 16px",
            borderRadius: 999,
            border: "1.5px solid #000",
            background: "#FFD858",
            fontWeight: 800,
            boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
          aria-label="새로고침"
        >
          {loading ? "로딩…" : "⟳ 새로고침"}
        </button>
      )}

      {/* 스켈레톤 애니메이션 */}
      <style>{`@keyframes pulse{0%{background-position:100% 50%}100%{background-position:0 50%}}`}</style>

      {/* API 베이스 안내 */}
      <div style={{ ...containerStyle, marginTop: 18 }}>
        <p style={{ fontSize: 12, color: "#999" }}>
          API Base: <code>{apiBaseShown || getResolvedStockApiBase() || "(auto)"}</code>
        </p>
      </div>
    </section>
  );
}
