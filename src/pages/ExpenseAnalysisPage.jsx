// src/pages/ExpenseAnalysisPage.jsx
import { useEffect, useMemo, useState } from "react";
import { loadRange } from "../api/consumption";
import { loadBudgets } from "../api/budget";
import { generateCautions } from "../api/tips";

/* -------------------- 유틸 -------------------- */
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

const normalizeConsumption = (raw) => {
  const x = raw ?? {};
  const id =
    x.id ??
    x.consumptionId ??
    x.seq ??
    x.pk ??
    x._id ??
    null;

  const category =
    (typeof x.category === "string" ? x.category : null) ??
    x.categoryName ??
    x.cat ??
    x.type ??
    x.consumptionCategory ??
    (typeof x.category === "object"
      ? (x.category?.name ?? x.category?.label ?? x.category?.title)
      : null) ??
    "기타";

  const dateRaw =
    x.date ??
    x.useDate ??
    x.spentDate ??
    x.paymentDate ??
    x.createdDate ??
    x.created_at ??
    x.createdAt ??
    "";
  const date = typeof dateRaw === "string" ? dateRaw.slice(0, 10) : "";

  const amountRaw = x.amount ?? x.price ?? x.money ?? x.cost ?? x.value ?? 0;
  const amount = Number(amountRaw ?? 0);

  const memo =
    x.memo ??
    x.description ??
    x.note ??
    x.desc ??
    "";

  return { ...x, id, category, date, amount, memo };
};

const formatKRW = (n) => Number(n || 0).toLocaleString() + "원";

// 기본 기간: 이번 달 1일 ~ 말일
const defaultRange = () => {
  const d = new Date();
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const start = `${ym}-01`;
  const end = `${ym}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
};

// 날짜 유틸
const pad2 = (n) => String(n).padStart(2, "0");
const parseYMD = (s) => new Date(`${s}T00:00:00`);
const ymStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const monthFirst = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthLast  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const diffDaysInclusive = (a, b) => Math.max(0, Math.floor((b - a) / 86400000) + 1);

// 팔레트(톤 통일)
const COLORS = [
  "#FFD858", "#FFAD70", "#8FD3FF", "#B2F7A1", "#D6C1FF",
  "#FFC7E2", "#FFA6A6", "#9FE3D4", "#BBD3FF", "#E8E594"
];

/* -------------------- 도넛 섹터 Path 유틸(겹침 없음) -------------------- */
const deg2rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => {
  const rad = deg2rad(deg - 90); // 0deg를 12시 방향으로
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};
/** 도넛 섹터 path(d) */
const donutPath = (cx, cy, rOuter, rInner, startDeg, endDeg) => {
  let s = Math.max(0, Math.min(360, startDeg));
  let e = Math.max(0, Math.min(360, endDeg));
  if (e < s) [s, e] = [e, s];
  const sweep = Math.max(0.01, e - s);
  const largeArc = sweep > 180 ? 1 : 0;

  const [x1, y1] = polar(cx, cy, rOuter, s);
  const [x2, y2] = polar(cx, cy, rOuter, s + sweep);
  const [x3, y3] = polar(cx, cy, rInner, s + sweep);
  const [x4, y4] = polar(cx, cy, rInner, s);

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
};

const ExpenseAnalysisPage = () => {
  const init = defaultRange();
  const [startDate, setStartDate] = useState(init.start);
  const [endDate, setEndDate] = useState(init.end);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // 예산(기간 비례 합산)
  const [rangeBudget, setRangeBudget] = useState(0);
  const [budgetLoading, setBudgetLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [cautions, setCautions] = useState([]);
  const [aiError, setAiError] = useState("");

  /* -------------------- 서버 로드 -------------------- */
  const fetchRange = async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      alert("시작일이 종료일보다 늦습니다. 날짜를 다시 선택하세요.");
      return;
    }
    setLoading(true);
    try {
      const data = await loadRange(startDate, endDate, { page: 0, size: 2000 });
      setRows(asArray(data).map(normalizeConsumption));
    } catch (err) {
      console.warn("분석 구간 지출 조회 실패:", err);
      setRows([]);
      alert("지출 데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 기간에 걸친 월별 예산 조회 + 일수 비례 합산
  const fetchRangeBudget = async () => {
    if (!startDate || !endDate) {
      setRangeBudget(0);
      return;
    }
    try {
      setBudgetLoading(true);

      const s = parseYMD(startDate);
      const e = parseYMD(endDate);

      // 월 세그먼트 생성
      const segs = [];
      let cur = new Date(s.getFullYear(), s.getMonth(), 1);
      const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);

      while (cur <= endMonth) {
        const ym = ymStr(cur);
        const first = monthFirst(cur);
        const last = monthLast(cur);

        const segStart = s > first ? s : first;
        const segEnd = e < last ? e : last;

        const overlapDays = diffDaysInclusive(segStart, segEnd);
        const monthDays = last.getDate();

        if (overlapDays > 0) {
          segs.push({ ym, monthDays, overlapDays });
        }
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }

      if (!segs.length) {
        setRangeBudget(0);
        return;
      }

      // 월별 예산 조회
      const uniqYms = Array.from(new Set(segs.map((s) => s.ym)));
      const results = await Promise.all(
        uniqYms.map(async (ym) => {
          try {
            const list = await loadBudgets(ym);
            const sum = asArray(list).reduce((acc, b) => acc + Number(b.amount || 0), 0);
            return [ym, sum];
          } catch (e) {
            console.warn("예산 조회 실패:", ym, e);
            return [ym, 0];
          }
        })
      );
      const map = Object.fromEntries(results); // ym -> monthBudget

      // 비례 합산
      const total = segs.reduce((acc, s) => {
        const m = Number(map[s.ym] || 0);
        const prorated = m * (s.overlapDays / Math.max(1, s.monthDays));
        return acc + prorated;
      }, 0);

      setRangeBudget(Math.round(total));
    } catch (e) {
      console.warn("기간 예산 계산 실패:", e);
      setRangeBudget(0);
    } finally {
      setBudgetLoading(false);
    }
  };

  useEffect(() => {
    fetchRange();
    fetchRangeBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  /* -------------------- 집계/파생 -------------------- */
  const totalAmount = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  );

  // 카테고리 집계
  const byCategory = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.category || "기타";
      map.set(key, (map.get(key) || 0) + Number(r.amount || 0));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows]);

  // 일별 합계(미니 막대)
  const byDate = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (!r.date) continue;
      m.set(r.date, (m.get(r.date) || 0) + Number(r.amount || 0));
    }
    return Array.from(m.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [rows]);

  const avgDaily = useMemo(() => {
    if (!byDate.length) return 0;
    const sum = byDate.reduce((s, d) => s + d.amount, 0);
    return Math.round(sum / byDate.length);
  }, [byDate]);

  const topDay = useMemo(() => {
    if (!byDate.length) return null;
    return byDate.reduce((mx, d) => (d.amount > (mx?.amount || 0) ? d : mx), null);
  }, [byDate]);

  // 간단 인사이트(휴리스틱)
  const insights = useMemo(() => {
    const items = [];
    if (byCategory.length) {
      const total = totalAmount || 1;
      const top = byCategory[0];
      items.push(
        `가장 큰 지출 카테고리는 '${top.name}' (${Math.round((top.amount / total) * 100)}%).`
      );
    }
    if (topDay) {
      items.push(`최대 지출일은 ${topDay.date} (약 ${formatKRW(topDay.amount)}).`);
    }
    if (avgDaily) {
      items.push(`기간 평균 일지출은 약 ${formatKRW(avgDaily)}입니다.`);
    }
    return items;
  }, [byCategory, topDay, avgDaily, totalAmount]);

  /* -------------------- AI 주의(경고) -------------------- */
  const runCautions = async () => {
    if (!rows.length) {
      setCautions([]);
      setAiError("");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const payload = {
        yearMonth: `${startDate}~${endDate}`, // 범위 설명
        totalAmount,
        budget: Number(rangeBudget || 0),     // ✅ 실제 예산(기간 비례 합산)
        byCategory: byCategory.map((c) => ({ name: c.name, amount: c.amount })),
      };
      const res = await generateCautions(payload, { useLLM: true });
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.tips)
        ? res.tips
        : [];
      setCautions(list.map(String).filter(Boolean).slice(0, 5));
    } catch (err) {
      console.warn("AI 주의 생성 실패(분석 탭):", err);
      setAiError("주의 생성에 실패했어요. 다시 시도해 주세요.");
      setCautions([]);
    } finally {
      setAiLoading(false);
    }
  };

  // 데이터/예산 변경 시 자동 실행
  useEffect(() => {
    if (rows.length) runCautions();
    else {
      setCautions([]);
      setAiError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rangeBudget]);

  /* -------------------- 스타일 공통 -------------------- */
  const panelStyle = {
    border: "1.5px solid #000",
    borderRadius: "10px",
    padding: "24px 30px",
    marginBottom: "30px",
  };

  /* -------------------- 섹터(도넛 Path) 데이터 -------------------- */
  const sectors = useMemo(() => {
    if (!byCategory.length || totalAmount <= 0) return [];
    const gapDeg = 1.4;            // 조각 사이 간격(도)
    const usable = 360 - byCategory.length * gapDeg;
    const MIN_SPAN = 0.6;          // 너무 작은 조각은 숨김(겹침 방지)
    let cursor = 0;

    return byCategory.map((c, i) => {
      const ratio = c.amount / totalAmount;
      let span = usable * ratio;
      if (span < MIN_SPAN) return null;
      const start = cursor;
      const end = cursor + span;
      cursor = end + gapDeg;
      return {
        name: c.name,
        color: COLORS[i % COLORS.length],
        start,
        end,
        amount: c.amount,
        pct: Math.round(ratio * 100),
      };
    }).filter(Boolean);
  }, [byCategory, totalAmount]);

  /* -------------------- 렌더 -------------------- */
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
            지출 분석
          </h1>
          <p style={{ color: "#555", fontSize: "15px" }}>
            지출 패턴을 분석하고 인사이트를 얻으세요.
          </p>
        </div>

        {/* === 날짜 선택 === */}
        <div
          style={{
            ...panelStyle,
            display: "flex",
            justifyContent: "space-between",
            gap: "30px",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={() => { fetchRange(); fetchRangeBudget(); }}
              disabled={loading || budgetLoading}
              style={{
                backgroundColor: "#FFD858",
                border: "1.5px solid #000",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              {loading || budgetLoading ? "불러오는 중..." : "분석 새로고침"}
            </button>
          </div>
        </div>

        {/* === 카테고리별 지출 분포(도넛 Path) — 바깥 흰 테두리 제거 === */}
        <div style={{ ...panelStyle, minHeight: "260px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
            카테고리별 지출 분포
          </h3>

          {!rows.length ? (
            <p style={{ color: "#999" }}>
              기간 내 지출 데이터가 없습니다. 날짜를 변경해 보세요.
            </p>
          ) : sectors.length === 0 ? (
            <p style={{ color: "#999" }}>집계할 데이터가 없습니다.</p>
          ) : (
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* 도넛(섹터 Path) — 불필요한 배경 원과 boxShadow 제거 */}
              <svg
                width="260"
                height="260"
                viewBox="0 0 260 260"
                role="img"
                aria-label="카테고리별 지출 도넛 차트"
                style={{ flex: "0 0 auto" }}
              >
                {/* 각 섹터(겹침 없음, 균일 gap) — stroke 미사용 */}
                {sectors.map((p, idx) => {
                  const d = donutPath(130, 130, 102, 68, p.start, p.end);
                  return (
                    <path key={idx} d={d} fill={p.color}>
                      <title>{`${p.name || "기타"}: ${formatKRW(p.amount)} (${p.pct}%)`}</title>
                    </path>
                  );
                })}

                {/* 중앙 라벨 */}
                <circle cx="130" cy="130" r="64" fill="#fff" stroke="#E5E7EB" />
                <text x="130" y="122" textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "#6B7280" }}>
                  총 지출
                </text>
                <text x="130" y="142" textAnchor="middle" style={{ fontSize: 15, fontWeight: 800, fill: "#111827" }}>
                  {formatKRW(totalAmount)}
                </text>
              </svg>

              {/* 범례 */}
              <div style={{ minWidth: 280, flex: "1 1 280px" }}>
                {sectors.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "14px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: p.color,
                      }}
                    />
                    <div style={{ fontWeight: 600 }}>{p.name || "기타"}</div>
                    <div style={{ textAlign: "right", fontSize: 13, color: "#374151" }}>
                      {formatKRW(p.amount)} ({p.pct}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* === 기간 내 지출 추이(미니 막대 스파크) === */}
        <div style={{ ...panelStyle, minHeight: "220px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
            기간 내 지출 추이
          </h3>

          {!byDate.length ? (
            <p style={{ color: "#999" }}>표시할 데이터가 없습니다.</p>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  height: 120,
                  border: "1px dashed #ddd",
                  padding: "12px",
                  borderRadius: 8,
                  overflowX: "auto",
                }}
              >
                {(() => {
                  const max = Math.max(...byDate.map((d) => d.amount), 1);
                  return byDate.map((d) => {
                    const h = Math.max(8, Math.round((d.amount / max) * 100));
                    return (
                      <div key={d.date} title={`${d.date} - ${formatKRW(d.amount)}`}>
                        <div
                          style={{
                            width: 8,
                            height: h,
                            background: "#FFD858",
                            border: "1px solid #000",
                            borderBottomLeftRadius: 4,
                            borderBottomRightRadius: 4,
                          }}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
                총 {formatKRW(totalAmount)} · 일평균 {formatKRW(avgDaily)}
                {topDay ? ` · 최대 ${topDay.date} (${formatKRW(topDay.amount)})` : ""}
                {Number.isFinite(rangeBudget) && rangeBudget > 0
                  ? ` · 기간 예산 ${formatKRW(rangeBudget)}`
                  : ""}
              </div>
            </div>
          )}
        </div>

        {/* === 인사이트 + 주의(모델) === */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
          <div style={{ ...panelStyle, flex: 1, minHeight: "150px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
              인사이트
            </h3>
            {!rows.length ? (
              <p style={{ color: "#aaa" }}>데이터를 불러오면 자동으로 요약됩니다.</p>
            ) : insights.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {insights.map((t, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#aaa" }}>표시할 인사이트가 없습니다.</p>
            )}
          </div>

          <div style={{ ...panelStyle, flex: 1, minHeight: "150px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
                주의
              </h3>
              <button
                onClick={runCautions}
                disabled={aiLoading || !rows.length}
                style={{
                  backgroundColor: "#FFD858",
                  border: "1.5px solid #000",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontWeight: 700,
                  cursor: aiLoading || !rows.length ? "not-allowed" : "pointer",
                }}
              >
                {aiLoading ? "생성 중..." : "다시 생성"}
              </button>
            </div>

            {!rows.length ? (
              <p style={{ color: "#aaa" }}>
                기간 데이터가 준비되면 자동으로 주의를 생성합니다.
              </p>
            ) : aiError ? (
              <p style={{ color: "#E85A00" }}>{aiError}</p>
            ) : cautions.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {cautions.map((t, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {t}
                  </li>
                ))}
              </ul>
            ) : aiLoading ? (
              <p style={{ color: "#777" }}>모델이 주의를 생성 중입니다…</p>
            ) : (
              <p style={{ color: "#aaa" }}>생성된 주의가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpenseAnalysisPage;
