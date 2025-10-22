// src/pages/AccountBookPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  loadConsumptions,
  createConsumptions,
  updateConsumption,
  deleteConsumption,
} from "/src/api/consumption.js";
import { loadBudgets, upsertBudget } from "../api/budget";
import { upsertMemo, loadMemo } from "/src/api/memo"; // 메모 저장/조회

const DEFAULT_BUDGET_CATEGORY = "전체"; // 백엔드 category 필수 대응

// 어떤 응답 형태여도 배열로 변환
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

// YYYY-MM 문자열 ↔ Date
const ymToDate = (ymStr) => {
  const [y, m] = ymStr.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, 1);
};
const dateToYm = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function AccountBookPage() {
  // -------- Month state --------
  const initYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [ym, setYm] = useState(initYm()); // "YYYY-MM"

  // -------- Data state --------
  const [expenses, setExpenses] = useState([]);       // 현재 월 지출 (배열)
  const [budgetsList, setBudgetsList] = useState([]); // 현재 월 예산(카테고리별)
  const [memoMap, setMemoMap] = useState({});         // id(문자열) → memo 캐시

  // -------- Derived --------
  const monthlyBudget = useMemo(() => {
    const list = asArray(budgetsList);
    return list.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  }, [budgetsList]);

  const totalExpense = useMemo(() => {
    const list = asArray(expenses);
    return list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const dailyTotals = useMemo(() => {
    const acc = {};
    for (const cur of asArray(expenses)) {
      const key = cur.date;
      if (!key) continue;
      acc[key] = (acc[key] || 0) + Number(cur.amount || 0);
    }
    return acc;
  }, [expenses]);

  // -------- Modal/Input state --------
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    id: null,       // 수정 시 필요
    category: "",
    date: "",
    amount: "",
    memo: "",       // 지출 설명 = 서버 메모
  });
  const [editingIndex, setEditingIndex] = useState(null); // 수정중인 인덱스

  const categories = [
    "생활", "식비", "교통", "주거", "통신", "쇼핑", "카페/간식", "의료/건강", "문화/여가", "기타"
  ];

  // -------- Month navigation --------
  const moveMonth = (delta) => {
    const d = ymToDate(ym);
    d.setMonth(d.getMonth() + delta);
    setYm(dateToYm(d));
  };

  // Calendar calc
  const curDate = ymToDate(ym);
  const year = curDate.getFullYear();
  const monthIndex = curDate.getMonth(); // 0-11
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  // -------- 서버 로드 --------
  const fetchMonthExpenses = async () => {
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
    try {
      const list = await loadConsumptions({ startDate, endDate, page: 0, size: 1000 });
      setExpenses(asArray(list));
    } catch (e) {
      console.warn("지출 조회 실패:", e);
      alert("지출 조회에 실패했어요.");
      setExpenses([]); // 방탄
    }
  };

  const fetchMonthBudgets = async () => {
    try {
      const list = await loadBudgets(ym); // [{id, month, category, amount}]
      setBudgetsList(asArray(list));
    } catch (e) {
      console.warn("예산 조회 실패:", e);
      alert("예산 조회에 실패했어요.");
      setBudgetsList([]); // 방탄
    }
  };

  useEffect(() => {
    fetchMonthExpenses();
    fetchMonthBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  // -------- Budget handlers --------
  const handleSaveBudget = async () => {
    if (budgetInput === "" || isNaN(budgetInput)) {
      alert("숫자 금액을 입력하세요.");
      return;
    }
    const amount = Number(budgetInput);
    try {
      await upsertBudget({ month: ym, category: DEFAULT_BUDGET_CATEGORY, amount });
      setIsBudgetOpen(false);
      setBudgetInput("");
      await fetchMonthBudgets();
    } catch (e) {
      console.warn("예산 저장 실패:", e);
      alert("예산 저장에 실패했어요.");
    }
  };

  // -------- Memo helpers --------
  // JSON이든 순수 텍스트든 안전하게 메모 문자열을 추출
  const safeExtractMemo = (resp) => {
    if (resp == null) return "";
    if (typeof resp === "string") return resp; // text/plain 대응
    if (typeof resp === "object") {
      const v = resp.memo ?? resp.value ?? resp.data?.memo ?? resp.data?.value ?? "";
      return typeof v === "string" ? v : String(v ?? "");
    }
    return String(resp);
  };

  const fetchMemoAndPatch = async (cid) => {
    try {
      const resp = await loadMemo(cid); // GET /memo/:id
      console.log("[memo:get]", cid, resp);
      const val = safeExtractMemo(resp);

      // 모달 입력값 갱신 (id 타입 불일치 방지: 문자열 비교)
      setNewExpense((prev) =>
        (prev && String(prev.id) === String(cid)) ? { ...prev, memo: val } : prev
      );

      // 리스트 즉시 반영
      setExpenses((prev) =>
        asArray(prev).map((x) =>
          String(x.id) === String(cid) ? { ...x, memo: val } : x
        )
      );

      // 캐시 저장 (문자열 키 통일)
      setMemoMap((prev) => ({ ...prev, [String(cid)]: val }));
    } catch (e) {
      console.warn("[memo:get] failed", cid, e);
      setMemoMap((prev) => ({ ...prev, [String(cid)]: "" }));
    }
  };

  // -------- Expense handlers --------
  const handleOpenCreate = () => {
    setNewExpense({ id: null, category: "", date: "", amount: "", memo: "" });
    setEditingIndex(null);
    setIsExpenseOpen(true);
  };

  const handleEdit = (index) => {
    const list = asArray(expenses);
    const item = list[index];
    if (!item) return;

    const fallback = item.memo ?? item.description ?? item.note ?? item.desc ?? "";
    setNewExpense({
      id: item.id ?? null,
      category: item.category || "",
      date: item.date || "",
      amount: String(item.amount ?? ""),
      memo: memoMap[String(item.id)] ?? memoMap[item.id] ?? fallback, // 캐시 우선
    });
    setEditingIndex(index);
    setIsExpenseOpen(true);

    // 실제 DB 메모 조회해서 최신값 반영
    if (item.id != null) fetchMemoAndPatch(item.id);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseOpen(false);
    setEditingIndex(null);
    setNewExpense({ id: null, category: "", date: "", amount: "", memo: "" });
  };

  // 생성/수정 공용 제출 (메모는 memo API로 저장)
  const handleSubmitExpense = async () => {
    const { id, category, date, amount, memo } = newExpense;
    if (!category || !date || !amount) {
      alert("카테고리 / 날짜 / 금액을 모두 입력하세요.");
      return;
    }
    const memoVal = (memo ?? "").trim();
    try {
      if (editingIndex !== null) {
        // 수정
        if (!id) {
          alert("이 항목에는 id가 없어 수정할 수 없습니다.");
          return;
        }
        await updateConsumption(id, {
          category,
          amount: Number(amount),
          date,
        });
        await upsertMemo(id, memoVal);

        // 로컬/캐시 반영
        setExpenses((prev) =>
          asArray(prev).map((x) =>
            String(x.id) === String(id) ? { ...x, memo: memoVal } : x
          )
        );
        setMemoMap((prev) => ({ ...prev, [String(id)]: memoVal }));
      } else {
        // 생성 (배열로 전송)
        const created = await createConsumptions([{ category, amount: Number(amount), date }]);

        // 응답에서 id 확보 시도
        let createdId = Array.isArray(created) ? created[0]?.id : (created?.id ?? null);

        // 없으면 이번 달 내역 재조회로 매칭
        if (createdId == null) {
          const startDate = `${ym}-01`;
          const endDate = `${ym}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
          const fresh = await loadConsumptions({ startDate, endDate, page: 0, size: 1000 });
          const list = asArray(fresh)
            .filter(x => x.category === category && x.date === date && Number(x.amount) === Number(amount))
            .sort((a, b) => (Number(b.id || 0) - Number(a.id || 0)));
          createdId = list[0]?.id ?? null;
        }

        if (createdId != null) {
          await upsertMemo(createdId, memoVal);
          setMemoMap((prev) => ({ ...prev, [String(createdId)]: memoVal }));
        }
      }
      handleCloseExpenseModal();
      await fetchMonthExpenses();
    } catch (e) {
      console.warn("지출 저장 실패:", e);
      alert("지출 저장에 실패했어요.");
    }
  };

  const handleDelete = async (item) => {
    const id = item?.id;
    if (!id) {
      alert("이 항목에는 id가 없어 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("정말로 삭제하시겠어요?")) return;
    try {
      await deleteConsumption(id);
      await fetchMonthExpenses();
    } catch (e) {
      console.warn("지출 삭제 실패:", e);
      alert("지출 삭제에 실패했어요.");
    }
  };

  // -------- Render --------
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={topRowStyle}>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>가계부</h1>
            <p style={{ color: "#555", fontSize: 15 }}>지출 내역을 확인하고 관리하세요.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setIsBudgetOpen(true)} style={btnPrimary}>예산 입력</button>
            <button onClick={handleOpenCreate} style={btnPrimary}>지출 추가</button>
          </div>
        </div>

        {/* Month Nav */}
        <div style={navRowStyle}>
          <button type="button" onClick={() => moveMonth(-1)} style={btnGhost} title="이전 달">◀</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {year}년 {monthIndex + 1}월
          </h2>
          <button type="button" onClick={() => moveMonth(1)} style={btnGhost} title="다음 달">▶</button>
          <input
            type="month"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
            style={{ marginLeft: 8, border: "1px solid #ccc", borderRadius: 8, padding: "6px 8px" }}
          />
        </div>

        {/* Budget */}
        <div style={{ textAlign: "left", fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
          {year}년 {monthIndex + 1}월 목표 예산{" "}
          <span style={{ marginLeft: 10, fontWeight: 800 }}>{monthlyBudget.toLocaleString()}원</span>
        </div>

        {/* Summary cards */}
        <div style={cardsRowStyle}>
          <SummaryCard
            title="총 지출"
            value={`${totalExpense.toLocaleString()}원`}
            sub={`총 ${asArray(expenses).length}건`}
            highlight
          />
          <SummaryCard title="카테고리별 분포" value="준비 중" sub="" />
          <SummaryCard title="AI 절약 팁" value="준비 중" sub="" />
        </div>

        {/* Expense list */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>지출 내역 ({ym})</h3>
          {asArray(expenses).length === 0 ? (
            <p style={{ color: "#999" }}>등록된 지출이 없습니다.</p>
          ) : (
            asArray(expenses).map((e, i) => {
              const memoText = memoMap[String(e.id)] ?? memoMap[e.id] ?? e.memo ?? e.description ?? e.note ?? e.desc ?? "";
              return (
                <div key={e.id ?? i} style={rowItemStyle}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{e.category}</p>
                    <p style={{ fontSize: 13, color: "#555" }}>
                      {e.date}{memoText ? `  -  ${memoText}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <p style={{ fontWeight: 700 }}>{Number(e.amount).toLocaleString()}원</p>
                    <button onClick={() => handleEdit(i)} style={iconBtn} aria-label="수정" title="수정">✏️</button>
                    <button onClick={() => handleDelete(e)} style={iconBtn} aria-label="삭제" title="삭제">🗑️</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calendar */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
            {year}년 {monthIndex + 1}월
          </h3>
          <div style={calendarGridStyle}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} style={{ fontWeight: 700 }}>{d}</div>
            ))}
            {calendarDays.map((day, idx) =>
              day ? (
                <div
                  key={idx}
                  style={{
                    minHeight: 60,
                    borderRadius: 8,
                    padding: 4,
                    backgroundColor: dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`]
                      ? "#fff7cc"
                      : "transparent"
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{day}</div>
                  {dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`] ? (
                    <div style={{ color: "#E85A00", fontSize: 12 }}>
                      - {dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`].toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div key={idx}></div>
              )
            )}
          </div>
        </div>

        {/* Budget Modal */}
        {isBudgetOpen ? (
          <Modal onClose={() => setIsBudgetOpen(false)}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {ym} 월 예산 설정
            </h3>

            {/* 카테고리 선택 제거 — 한 번에 전체 예산만 */}
            <input
              type="number"
              placeholder="예산 입력 (원)"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveBudget(); }}
              style={inputStyle}
            />
            <div>
              <button onClick={handleSaveBudget} style={btnPrimary}>저장</button>
              <button onClick={() => setIsBudgetOpen(false)} style={btnText}>닫기</button>
            </div>

            {asArray(budgetsList).length > 0 && (
              <div style={{ marginTop: 16, textAlign: "left" }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>설정된 예산</p>
                {asArray(budgetsList).map((b) => (
                  <div key={b.id ?? `${b.category}-${b.amount}`} style={{ fontSize: 14, color: "#444" }}>
                    • {b.category}: {Number(b.amount).toLocaleString()}원
                  </div>
                ))}
              </div>
            )}
          </Modal>
        ) : null}

        {/* Expense Modal (생성/수정 공용) */}
        {isExpenseOpen ? (
          <Modal onClose={handleCloseExpenseModal}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {editingIndex !== null ? "지출 수정" : "지출 추가"}
            </h3>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              style={inputStyle}
            >
              <option value="">카테고리 선택</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="금액 입력 (원)"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="지출 설명"
              value={newExpense.memo}
              onChange={(e) => setNewExpense({ ...newExpense, memo: e.target.value })}
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={handleSubmitExpense} style={btnPrimary}>
                {editingIndex !== null ? "수정" : "추가"}
              </button>
              <button onClick={handleCloseExpenseModal} style={btnText}>닫기</button>
            </div>
          </Modal>
        ) : null}
      </div>
    </section>
  );
}

/* ------- Presentational helpers ------- */
const sectionStyle = {
  width: "100%",
  minHeight: "100vh",
  backgroundColor: "#fff",
  padding: "50px 0",
  display: "flex",
  justifyContent: "center",
  overflowY: "auto"
};
const containerStyle = {
  width: "100%",
  maxWidth: "950px",
  padding: "0 80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch"
};
const topRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
};
const navRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16
};
const cardsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 40
};
const panelStyle = {
  border: "1.5px solid #000",
  borderRadius: 10,
  padding: "20px 30px",
  marginBottom: 30
};
const rowItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #eee",
  padding: "10px 0"
};
const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  textAlign: "center",
  gap: 8,
  fontSize: 14
};
const btnPrimary = {
  backgroundColor: "#FFD858",
  border: "1.5px solid #000",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 700,
  cursor: "pointer"
};
const btnGhost = {
  background: "transparent",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer"
};
const btnText = {
  background: "transparent",
  border: "none",
  marginLeft: 10,
  cursor: "pointer"
};
const iconBtn = { background: "transparent", border: "none", cursor: "pointer" };
const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginBottom: 10
};

function SummaryCard({ title, value, sub, highlight }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1.5px solid #000",
        borderRadius: 10,
        padding: "20px 30px",
        background: "#fff",
        transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
        willChange: "transform, box-shadow, border-color",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#FFD858";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#000";
      }}
    >
      <p style={{ fontWeight: 700 }}>{title}</p>
      <p
        style={{
          color: highlight ? "#FF9900" : "#000",
          fontWeight: 700,
          fontSize: 18,
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      {sub ? <p style={{ color: "#888", fontSize: 13 }}>{sub}</p> : null}
    </div>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "40px 60px",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
          minWidth: 420,
          maxWidth: 560,
          width: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto"
        }}
      >
        {children}
      </div>
    </div>
  );
}
