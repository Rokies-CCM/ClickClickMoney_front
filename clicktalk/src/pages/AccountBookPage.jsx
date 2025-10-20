import { useState } from "react";

const AccountBookPage = () => {
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const [newExpense, setNewExpense] = useState({
    category: "",
    date: "",
    amount: "",
    desc: "",
  });

  const categories = [
    "생활",
    "식비",
    "교통",
    "주거",
    "통신",
    "쇼핑",
    "카페/간식",
    "의료/건강",
    "문화/여가",
    "기타",
  ];

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const dailyTotals = expenses.reduce((acc, cur) => {
    acc[cur.date] = (acc[cur.date] || 0) + Number(cur.amount);
    return acc;
  }, {});

  const handleSaveBudget = (value) => {
    if (!value || isNaN(value)) return alert("숫자를 입력하세요.");
    setMonthlyBudget(Number(value));
    setIsBudgetOpen(false);
  };

  const handleAddExpense = () => {
    const { category, date, amount, desc } = newExpense;
    if (!category || !date || !amount || !desc)
      return alert("모든 항목을 입력하세요.");

    setExpenses((prev) => [...prev, newExpense]);
    setNewExpense({ category: "", date: "", amount: "", desc: "" }); // ✅ 초기화
    setIsExpenseOpen(false);
  };

  const handleDelete = (index) => {
    const filtered = expenses.filter((_, i) => i !== index);
    setExpenses(filtered);
  };

  const handleEdit = (index) => {
    const item = expenses[index];
    setNewExpense(item);
    setIsExpenseOpen(true);
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  // 달력 생성 (현재 월 기준)
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0부터 시작
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  return (
    <section
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "50px 0",
        display: "flex",
        justifyContent: "center", // ✅ 중앙 정렬
        overflowY: "auto", // ✅ 스크롤 허용
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "950px", // ✅ 페이지 중앙 고정폭
          padding: "0 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* 상단 제목 + 버튼 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <h1
              style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}
            >
              가계부
            </h1>
            <p style={{ color: "#555", fontSize: "15px" }}>
              지출 내역을 확인하고 관리하세요.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setIsBudgetOpen(true)}
              style={{
                backgroundColor: "#FFD858",
                border: "none",
                borderRadius: "20px",
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              예산 입력
            </button>
            <button
              onClick={() => setIsExpenseOpen(true)}
              style={{
                backgroundColor: "#FFD858",
                border: "none",
                borderRadius: "20px",
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              지출 추가
            </button>
          </div>
        </div>

        {/* 예산 표시 */}
        <div
          style={{
            textAlign: "left",
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: "24px",
          }}
        >
          한달 목표 예산{" "}
          <span style={{ marginLeft: "10px", fontWeight: 800 }}>
            {monthlyBudget.toLocaleString()}원
          </span>
        </div>

        {/* 상단 카드 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
              flex: 1,
            }}
          >
            <p style={{ fontWeight: 700 }}>총 지출</p>
            <p style={{ color: "#FF9900", fontWeight: 700, fontSize: "18px" }}>
              {totalExpense.toLocaleString()}원
            </p>
            <p style={{ color: "#888", fontSize: "13px" }}>
              총 {expenses.length}건
            </p>
          </div>
          <div
            style={{
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
              flex: 1,
            }}
          >
            <p style={{ fontWeight: 700 }}>카테고리별 분포</p>
            <p style={{ color: "#aaa", fontSize: "13px" }}>준비 중</p>
          </div>
          <div
            style={{
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "20px 30px",
              flex: 1,
            }}
          >
            <p style={{ fontWeight: 700 }}>AI 절약 팁</p>
            <p style={{ color: "#aaa", fontSize: "13px" }}>준비 중</p>
          </div>
        </div>

        {/* 지출 내역 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "20px 30px",
            marginBottom: "30px",
          }}
        >
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
            지출 내역
          </h3>
          {expenses.length === 0 ? (
            <p style={{ color: "#999" }}>등록된 지출이 없습니다.</p>
          ) : (
            expenses.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                  padding: "10px 0",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700 }}>{e.category}</p>
                  <p style={{ fontSize: "13px", color: "#555" }}>
                    {e.date} - {e.desc}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <p style={{ fontWeight: 700 }}>
                    {Number(e.amount).toLocaleString()}원
                  </p>
                  <button
                    onClick={() => handleEdit(i)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 달력 */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "20px 30px",
          }}
        >
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            {year}년 {month + 1}월
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} style={{ fontWeight: 700 }}>
                {d}
              </div>
            ))}
            {calendarDays.map((day, idx) =>
              day ? (
                <div
                  key={idx}
                  style={{
                    minHeight: "60px",
                    borderRadius: "8px",
                    padding: "4px",
                    backgroundColor: dailyTotals[
                      `${year}-${String(month + 1).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`
                    ]
                      ? "#fff7cc"
                      : "transparent",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "2px" }}>{day}</div>
                  {dailyTotals[
                    `${year}-${String(month + 1).padStart(2, "0")}-${String(
                      day
                    ).padStart(2, "0")}`
                  ] && (
                    <div style={{ color: "#E85A00", fontSize: "12px" }}>
                      -{" "}
                      {dailyTotals[
                        `${year}-${String(month + 1).padStart(2, "0")}-${String(
                          day
                        ).padStart(2, "0")}`
                      ].toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div key={idx}></div>
              )
            )}
          </div>
        </div>

        {/* 예산 입력창 */}
        {isBudgetOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "40px 60px",
                borderRadius: "16px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                textAlign: "center",
                minWidth: "400px",
              }}
            >
              <h3
                style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}
              >
                한달 목표 예산 설정
              </h3>
              <input
                type="number"
                placeholder="예산 입력 (원)"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  marginBottom: "20px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBudget(e.target.value);
                }}
              />
              <button
                onClick={() =>
                  handleSaveBudget(
                    document.querySelector("input[type='number']").value
                  )
                }
                style={{
                  backgroundColor: "#FFD858",
                  border: "1px solid #000",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                저장
              </button>
              <button
                onClick={() => setIsBudgetOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  marginLeft: "10px",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 지출 입력창 */}
        {isExpenseOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "40px 60px",
                borderRadius: "16px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                textAlign: "center",
                minWidth: "450px",
              }}
            >
              <h3
                style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}
              >
                지출 추가
              </h3>
              <select
                value={newExpense.category}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, category: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              >
                <option value="">카테고리 선택</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, date: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="number"
                placeholder="금액 입력 (원)"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, amount: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="text"
                placeholder="지출 설명 (예: 점심식사)"
                value={newExpense.desc}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, desc: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "20px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
              <button
                onClick={handleAddExpense}
                style={{
                  backgroundColor: "#FFD858",
                  border: "1px solid #000",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                추가
              </button>
              <button
                onClick={() => setIsExpenseOpen(false)} // ✅ 닫기 시 수정 유지
                style={{
                  background: "transparent",
                  border: "none",
                  marginLeft: "10px",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AccountBookPage;
