import { useState } from "react";

const ChatbotPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, type: "user" }]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        backgroundColor: "#EDC84D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 20px",
      }}
    >
      {/* === 제목 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          alignSelf: "flex-start",
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#000",
            marginLeft: "410px",
            marginBottom: "-7px",
          }}
        >
          AI 절약 코치
        </h1>
      </div>

      {/* === 챗봇 박스 === */}
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          height: "700px",
          background: "#fff",
          border: "1.5px solid #000",
          borderRadius: "18px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 3px 0 rgba(0,0,0,0.3)",
        }}
      >
        {/* 추천 질문 */}
        <div
          style={{
            borderBottom: "1.5px solid #000",
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#000",
            }}
          >
            추천 질문
          </h3>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {["이번 달 어디서 과소비 했나요?", "예산 목표 잡는 방법"].map(
              (q, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setMessages((prev) => [...prev, { text: q, type: "user" }])
                  }
                  style={{
                    background: "#fff",
                    border: "1px solid #000",
                    borderRadius: "10px",
                    padding: "6px 14px",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFD858")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#fff")
                  }
                >
                  {q}
                </button>
              )
            )}
          </div>
        </div>

        {/* 대화 영역 */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.type === "user" ? "flex-end" : "flex-start",
                backgroundColor:
                  msg.type === "user" ? "#FFD858" : "#f0f0f0",
                color: "#000",
                padding: "10px 16px",
                borderRadius: "18px",
                marginBottom: "10px",
                border: "1px solid #000",
                maxWidth: "70%",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* 입력창 */}
        <div
          style={{
            borderTop: "1.5px solid #000",
            display: "flex",
            alignItems: "center",
            background: "#fff",
            padding: "12px 20px",
            borderRadius: "0 0 18px 18px",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "15px",
              background: "transparent",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              backgroundColor: "#FFD858",
              border: "1px solid #000",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "18px" }}>📨</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ChatbotPage;
