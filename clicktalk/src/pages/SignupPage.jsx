const SignupPage = ({ go }) => {
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
          transform: "translateY(-40px)", // ✅ 폼 전체 위로 올리기
        }}
      >
        <div style={{ width: "400px" }}>
          {/* 제목 */}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "32px",
              textAlign: "left",
              transform: "translateX(-20px)", // ✅ 약간 왼쪽으로 이동
            }}
          >
            기본정보
          </h2>

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
              style={{
                flex: 1,
                background: "#fff",
                height: "44px",
                fontSize: "16px",
                fontWeight: 500,
                cursor: "pointer",
                marginRight: "10px",
                border: "0.8px solid #828282", // ✅ 얇은 검은 테두리 추가
              }}
              onClick={() => go("/")}
            >
              취소
            </button>

            {/* 회원가입 버튼 */}
            <button
              style={{
                flex: 1,
                background: "#FFD858",
                height: "44px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none", // ✅ 테두리 제거
              }}
            >
              회원가입
            </button>
          </div>
        </div>
      </main>
    </section>
  );
};

export default SignupPage;
