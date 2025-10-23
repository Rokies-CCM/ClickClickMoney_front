// src/pages/LoginPage.jsx
import { useState } from "react";
import { login, me } from "../api/auth"; //  API 래퍼 임포트

const LoginPage = ({ go }) => {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrMsg("");

    if (!id || !pw) {
      setErrMsg("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      // 1) 로그인 → accessToken 저장 (auth.login 내부에서 저장)
      await login(id, pw);

      // 2) 토큰으로 내 정보 확인(옵션) — 실패하면 catch로
      await me();

      // 3) 이동
      go("/wallet");
    } catch (error) {
      setErrMsg(error?.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
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
      <form
        onSubmit={handleLogin}
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

        {/* 오류 메시지 */}
        {errMsg && (
          <div
            style={{
              background: "#fff2f2",
              border: "1px solid #ffb3b3",
              color: "#c92a2a",
              borderRadius: "4px",
              padding: "8px 10px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            {errMsg}
          </div>
        )}

        {/* 아이디 */}
        <input
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
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
          autoComplete="current-password"
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
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#e4ca62" : "#FFD858",
            border: "none",
            height: "46px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* 구분선 */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#e0e0e0",
            marginBottom: "20px",
          }}
        />

        {/* 추가 버튼 3개 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <button
            type="button"
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
            type="button"
            style={{
              flex: 1,
              height: "42px",
              border: "0.8px solid #000",
              background: "#fff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onClick={() => alert("아이디 찾기 기능은 준비 중입니다.")}
          >
            아이디 찾기
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              height: "42px",
              border: "0.8px solid #000",
              background: "#fff",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onClick={() => alert("비밀번호 찾기 기능은 준비 중입니다.")}
          >
            비밀번호 찾기
          </button>
        </div>
      </form>
    </section>
  );
};

export default LoginPage;
