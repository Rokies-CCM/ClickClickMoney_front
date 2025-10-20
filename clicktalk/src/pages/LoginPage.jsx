import { useState } from "react";

const LoginPage = ({ go }) => {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const handleLogin = () => {
    // 빈칸 확인
    if (!id || !pw) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    // 로그인 검증 (샘플용: 실제로는 서버 검증)
    if (id === "test" && pw === "1234") {
      alert("로그인 성공!");
      go("/wallet"); // 메인 페이지로 이동
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      {/* === 로그인 박스 === */}
      <div
        style={{
          width: "420px",
          padding: "48px 42px",
          border: "1px solid #999",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        {/* 제목 */}
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "24px",
          }}
        >
          로그인
        </h2>

        {/* 아이디 */}
        <input
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          style={{
            height: "44px",
            border: "1px solid #ccc",
            padding: "0 10px",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "15px",
          }}
        />

        {/* 비밀번호 */}
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{
            height: "44px",
            border: "1px solid #ccc",
            padding: "0 10px",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "15px",
          }}
        />

        {/* 로그인 버튼 */}
        <button
          style={{
            background: "#FFD858",
            border: "none",
            height: "46px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
          onClick={handleLogin}
        >
          로그인
        </button>

        {/* 구분선 */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#e0e0e0",
            marginBottom: "20px",
          }}
        ></div>

        {/* 추가 버튼 3개 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <button
            style={{
              flex: 1,
              height: "42px",
              border: "none",
              background: "#FFD858",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => go("/signup")}
          >
            회원가입
          </button>
          <button
            style={{
              flex: 1,
              height: "42px",
              border: "0.8px solid #000",
              background: "#fff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            아이디 찾기
          </button>
          <button
            style={{
              flex: 1,
              height: "42px",
              border: "0.8px solid #000",
              background: "#fff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            비밀번호 찾기
          </button>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
