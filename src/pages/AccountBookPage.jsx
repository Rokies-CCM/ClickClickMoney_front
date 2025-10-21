// src/pages/AccountBookPage.jsx
import { useEffect, useMemo, useState } from "react";

export default function AccountBookPage() {
  // -------- LocalStorage Keys --------
  const LS_BUDGETS_KEY = "ab_budgets_v1";     // { "YYYY-MM": number }
  const LS_EXPENSES_KEY = "ab_expenses_v1";   // { "YYYY-MM": Expense[] }

  // -------- Month state --------
  const initYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [ym, setYm] = useState(initYm()); // "YYYY-MM"

  // -------- Data state --------
  const [budgets, setBudgets] = useState({});              // { ym: number }
  const [expensesByMonth, setExpensesByMonth] = useState({}); // { ym: Expense[] }

  // Derived (current month)
  const monthlyBudget = budgets[ym] || 0;
  const expenses = expensesByMonth[ym] || [];

  // -------- Modal/Input state --------
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "",
    date: "",
    amount: "",
    desc: ""
  });

  const categories = [
    "생활", "식비", "교통", "주거", "통신", "쇼핑", "카페/간식", "의료/건강", "문화/여가", "기타"
  ];

  // 수정 모드 추적
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingYm, setEditingYm] = useState(null);

  // -------- Totals --------
  const totalExpense = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );
  const dailyTotals = useMemo(() => {
    const acc = {};
    for (const cur of expenses) {
      const key = cur.date;
      acc[key] = (acc[key] || 0) + Number(cur.amount || 0);
    }
    return acc;
  }, [expenses]);

  // -------- Month navigation --------
  const ymToDate = (ymStr) => {
    const [y, m] = ymStr.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, 1);
  };
  const dateToYm = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

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

  // -------- Load/Save localStorage --------
  useEffect(() => {
    try {
      const b = localStorage.getItem(LS_BUDGETS_KEY);
      if (b) setBudgets(JSON.parse(b));
      const e = localStorage.getItem(LS_EXPENSES_KEY);
      if (e) setExpensesByMonth(JSON.parse(e));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_BUDGETS_KEY, JSON.stringify(budgets)); }
    catch (err) { console.warn("Failed to save budgets", err); }
  }, [budgets]);

  useEffect(() => {
    try { localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(expensesByMonth)); }
    catch (err) { console.warn("Failed to save budgets", err); }
  }, [expensesByMonth]);

  // -------- (Later) API stubs --------
  const API = {
    loadMonth: async (ymStr) => {
      return { budget: budgets[ymStr] || 0, expenses: expensesByMonth[ymStr] || [] };
    },
    saveBudget: async (ymStr, value) => { void ymStr; void value; return true; },
    upsertExpense: async (exp) => { void exp; return true; },
    deleteExpense: async (ymStr, index) => { void ymStr; void index; return true; }
  };

  // -------- Handlers --------
  const handleSaveBudget = async (value) => {
    if (value === "" || isNaN(value)) { alert("숫자를 입력하세요."); return; }
    const num = Number(value);
    setBudgets((prev) => ({ ...prev, [ym]: num }));
    setIsBudgetOpen(false);
    setBudgetInput("");
    try { await API.saveBudget(ym, num); }
    catch (err) { console.warn("Failed to save budgets", err); }
  };

  // 수정 모달 닫기 (변경 취소)
  const handleCloseExpenseModal = () => {
    setIsExpenseOpen(false);
    setEditingIndex(null);
    setEditingYm(null);
    setNewExpense({ category: "", date: "", amount: "", desc: "" });
  };

  const handleAddExpense = async () => {
    const { category, date, amount, desc } = newExpense;
    if (!category || !date || !amount || !desc) { alert("모든 항목을 입력하세요."); return; }

    const targetYm = date.slice(0, 7); // YYYY-MM

    // 수정 모드
    if (editingIndex !== null && editingYm) {
      setExpensesByMonth((prev) => {
        const next = { ...prev };
        const originalList = next[editingYm] ? [...next[editingYm]] : [];

        if (editingYm === targetYm) {
          // 같은 달이면 인덱스 위치 덮어쓰기
          if (originalList[editingIndex]) {
            originalList[editingIndex] = newExpense;
            next[editingYm] = originalList;
          }
        } else {
          // 달이 바뀌면 원래 달에서 제거 → 대상 달에 추가
          if (originalList[editingIndex]) {
            originalList.splice(editingIndex, 1);
            next[editingYm] = originalList;
          }
          const targetList = next[targetYm] ? [...next[targetYm]] : [];
          targetList.push(newExpense);
          next[targetYm] = targetList;
        }
        return next;
      });

      // 초기화
      setEditingIndex(null);
      setEditingYm(null);
      setNewExpense({ category: "", date: "", amount: "", desc: "" });
      setIsExpenseOpen(false);

      try { await API.upsertExpense(newExpense); }
      catch (err) { console.warn("Failed to save budgets", err); }
      return;
    }

    // 추가 모드
    setExpensesByMonth((prev) => {
      const list = prev[targetYm] ? [...prev[targetYm]] : [];
      list.push(newExpense);
      return { ...prev, [targetYm]: list };
    });
    setNewExpense({ category: "", date: "", amount: "", desc: "" });
    setIsExpenseOpen(false);
    try { await API.upsertExpense(newExpense); }
    catch (err) { console.warn("Failed to save budgets", err); }
  };

  const handleDelete = async (index) => {
    setExpensesByMonth((prev) => {
      const list = prev[ym] ? [...prev[ym]] : [];
      list.splice(index, 1);
      return { ...prev, [ym]: list };
    });
    try { await API.deleteExpense(ym, index); }
    catch (err) { console.warn("Failed to save budgets", err); }
  };

  const handleEdit = (index) => {
    const item = (expensesByMonth[ym] || [])[index];
    if (!item) return;
    setNewExpense(item);
    setEditingIndex(index);
    setEditingYm(ym);
    setIsExpenseOpen(true);
    // ⚠️ 더 이상 목록에서 제거하지 않음 (닫기 시에도 유지)
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
            <button onClick={() => setIsExpenseOpen(true)} style={btnPrimary}>지출 추가</button>
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
          <SummaryCard title="총 지출" value={`${totalExpense.toLocaleString()}원`} sub={`총 ${expenses.length}건`} highlight />
          <SummaryCard title="카테고리별 분포" value="준비 중" sub="" />
          <SummaryCard title="AI 절약 팁" value="준비 중" sub="" />
        </div>

        {/* Expense list */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>지출 내역 ({ym})</h3>
          {expenses.length === 0 ? (
            <p style={{ color: "#999" }}>등록된 지출이 없습니다.</p>
          ) : (
            expenses.map((e, i) => (
              <div key={i} style={rowItemStyle}>
                <div>
                  <p style={{ fontWeight: 700 }}>{e.category}</p>
                  <p style={{ fontSize: 13, color: "#555" }}>{e.date} - {e.desc}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ fontWeight: 700 }}>{Number(e.amount).toLocaleString()}원</p>
                  <button
                    onClick={() => handleEdit(i)}
                    style={iconBtn}
                    aria-label="수정"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    style={iconBtn}
                    aria-label="삭제"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
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
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{ym} 목표 예산 설정</h3>
            <input
              type="number"
              placeholder="예산 입력 (원)"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveBudget(budgetInput); }}
              style={inputStyle}
            />
            <div>
              <button onClick={() => handleSaveBudget(budgetInput)} style={btnPrimary}>저장</button>
              <button onClick={() => setIsBudgetOpen(false)} style={btnText}>닫기</button>
            </div>
          </Modal>
        ) : null}

        {/* Expense Modal */}
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
              placeholder="지출 설명 (예: 점심식사)"
              value={newExpense.desc}
              onChange={(e) => setNewExpense({ ...newExpense, desc: e.target.value })}
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div>
              <button onClick={handleAddExpense} style={btnPrimary}>
                {editingIndex !== null ? "저장" : "추가"}
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
  border: "1px solid #000",
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
        e.currentTarget.style.borderColor = "#000"; // 강조 테두리
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
