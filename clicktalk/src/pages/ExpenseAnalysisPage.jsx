import { useState } from "react";

const ExpenseAnalysisPage = () => {
  const [startDate, setStartDate] = useState("2025-10-01");
  const [endDate, setEndDate] = useState("2025-10-30");

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
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "24px 30px",
            display: "flex",
            justifyContent: "space-between",
            gap: "30px",
            marginBottom: "30px",
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
        </div>

        {/* === 카테고리별 지출 === */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "24px 30px",
            marginBottom: "30px",
            minHeight: "220px",
          }}
        >
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
            카테고리별 지출
          </h3>
          {/* 📊 원형 차트 자리 */}
          <div
            style={{
              width: "100%",
              height: "160px",
              background: "#f8f8f8",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            (원형 차트 영역)
          </div>
        </div>

        {/* === 월간 지출 추이 === */}
        <div
          style={{
            border: "1.5px solid #000",
            borderRadius: "10px",
            padding: "24px 30px",
            marginBottom: "30px",
            minHeight: "220px",
          }}
        >
          <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
            월간 지출 추이
          </h3>
          {/* 📈 꺾은선 그래프 자리 */}
          <div
            style={{
              width: "100%",
              height: "160px",
              background: "#f8f8f8",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            (지출 추이 그래프 영역)
          </div>
        </div>

        {/* === 인사이트 + 주석 === */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "24px 30px",
              minHeight: "150px",
            }}
          >
            <h3
              style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}
            >
              인사이트
            </h3>
            <p style={{ color: "#aaa" }}>
              AI 모델 결과로 요약된 분석 인사이트 표시
            </p>
          </div>

          <div
            style={{
              flex: 1,
              border: "1.5px solid #000",
              borderRadius: "10px",
              padding: "24px 30px",
              minHeight: "150px",
            }}
          >
            <h3
              style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}
            >
              주석
            </h3>
            <p style={{ color: "#aaa" }}>
              AI가 분석한 주요 소비 트렌드 또는 주석 내용 표시
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpenseAnalysisPage;
