// src/pages/SignupPage.jsx
import { useState } from "react";
import { register } from "../api/auth"; // 회원가입 API

const SignupPage = ({ go }) => {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pwCheck, setPwCheck] = useState("");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const handleSignup = async (e) => {
    e?.preventDefault();
    setErrMsg("");
    setOkMsg("");

    // === 유효성 검사 ===
    if (!id || !pw || !pwCheck) {
      setErrMsg("모든 항목을 입력해주세요.");
      return;
    }
    if (pw !== pwCheck) {
      setErrMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    // (선택) 간단 정책 예시
    if (pw.length < 8) {
      setErrMsg("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      setLoading(true);
      await register(id, pw); // 백엔드: { username, password }
      setOkMsg("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
      setTimeout(() => go("/login"), 800);
    } catch (err) {
      setErrMsg(err?.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      {/* === 메인 폼 === */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          transform: "translateY(-40px)",
        }}
      >
        <form onSubmit={handleSignup} style={{ width: "400px" }}>
          {/* 제목 */}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "32px",
              textAlign: "left",
              transform: "translateX(-20px)",
            }}
          >
            기본정보
          </h2>

          {/* 안내/에러 메시지 */}
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
          {okMsg && (
            <div
              style={{
                background: "#f1fff1",
                border: "1px solid #b8f5b8",
                color: "#2b8a3e",
                borderRadius: "4px",
                padding: "8px 10px",
                marginBottom: "12px",
                fontSize: "14px",
              }}
            >
              {okMsg}
            </div>
          )}

          {/* 아이디 */}
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 500,
              fontSize: "15px",
            }}
          >
            아이디
          </label>
          <input
            type="text"
            placeholder="영문, 숫자, 특수문자(_, .) 사용가능. 5~20자"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
            style={{
              width: "100%",
              height: "40px",
              border: "1px solid #ccc",
              padding: "0 10px",
              borderRadius: "4px",
              marginBottom: "16px",
            }}
          />

          {/* 비밀번호 */}
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 500,
              fontSize: "15px",
            }}
          >
            비밀번호
          </label>
          <input
            type="password"
            placeholder="영문자, 숫자, 특수문자 조합 8~20자"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            style={{
              width: "100%",
              height: "40px",
              border: "1px solid #ccc",
              padding: "0 10px",
              borderRadius: "4px",
              marginBottom: "16px",
            }}
          />

          {/* 비밀번호 확인 */}
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 500,
              fontSize: "15px",
            }}
          >
            비밀번호 확인
          </label>
          <input
            type="password"
            placeholder="비밀번호를 다시 입력하세요."
            value={pwCheck}
            onChange={(e) => setPwCheck(e.target.value)}
            autoComplete="new-password"
            style={{
              width: "100%",
              height: "40px",
              border: "1px solid #ccc",
              padding: "0 10px",
              borderRadius: "4px",
              marginBottom: "24px",
            }}
          />

          {/* 버튼 영역 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px",
            }}
          >
            {/* 취소 버튼 */}
            <button
              type="button"
              style={{
                flex: 1,
                background: "#fff",
                height: "44px",
                fontSize: "16px",
                fontWeight: 500,
                cursor: "pointer",
                marginRight: "10px",
                border: "0.8px solid #828282",
              }}
              onClick={() => go("/")}
            >
              취소
            </button>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                background: loading ? "#e4ca62" : "#FFD858",
                height: "44px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </div>
        </form>
      </main>
    </section>
  );
};

export default SignupPage;
