// src/pages/ChatbotPage.jsx
import { useEffect, useRef, useState } from "react";
import { askChat } from "../api/chatbot";

// 서버 응답 텍스트 정리 함수
const cleanText = (s) => {
  if (!s) return "";
  let t = String(s);

  // 1️⃣ SSE 관련 메타 토큰 제거
  t = t.replace(/\bdata:\s*\[DONE\]\b/gi, ""); // data: [DONE]
  t = t.replace(/\b(?:id|event):\s*[a-f0-9-]+\b/gi, ""); // id, event 헤더
  t = t.replace(/\b[a-f0-9]{8,}\b/g, ""); // 해시 ID (예: 8e80d77febfa)
  t = t.replace(/\[DONE\]/gi, ""); // [DONE]
  t = t.replace(/\s*(event:\s*(start|end|done))\s*/gi, "");

  // 2️⃣ 남은 포맷 문자/공백 정리
  t = t
    .replace(/\*\*/g, "") // 별표 제거
    .replace(/\n+/g, " ") // 줄바꿈 제거
    .replace(/\s+/g, " ") // 여러 공백 합치기
    .trim();

  return t;
};


const SourceButtonsRow = ({ buttons }) => {
  if (!buttons || !buttons.length) return null;
  return (
    <div
      style={{
        marginTop: "6px",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      {buttons.map((b, i) => {
        const label =
          (b.title && String(b.title).trim()) ||
          (b.host && String(b.host).trim()) ||
          (b.url &&
            (() => {
              try {
                const u = new URL(b.url);
                return u.hostname.replace(/^www\./, "");
              } catch {
                return b.url;
              }
            })()) ||
          "출처";
        return (
          <a
            key={i}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            style={{
              display: "inline-block",
              maxWidth: "220px",
              padding: "6px 10px",
              border: "1px solid #000",
              borderRadius: "999px",
              background: "#fff",
              textDecoration: "none",
              color: "#000",
              fontSize: "12px",
              lineHeight: "14px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
            🔗 {label}
          </a>
        );
      })}
    </div>
  );
};

const ChatbotPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const bottomRef = useRef(null);
  const scrollToBottom = (behavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages]);

  const appendUser = (text) =>
    setMessages((prev) => [...prev, { text, type: "user" }]);

  const appendBot = (text) =>
    setMessages((prev) => [...prev, { text, type: "bot" }]);

  const updateLastBot = (delta) =>
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.type !== "bot")
        return [...prev, { text: delta, type: "bot" }];
      const updated = { ...last, text: (last.text || "") + delta };
      return [...prev.slice(0, -1), updated];
    });

  const setLastBotButtons = (buttons) =>
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.type !== "bot") return prev;
      const updated = { ...last, sourceButtons: buttons || [] };
      return [...prev.slice(0, -1), updated];
    });

  const handleSend = async (qParam) => {
    const q = (qParam ?? input).trim();
    if (!q || loading) return;
    setInput("");
    appendUser(q);
    setLoading(true);
    scrollToBottom("auto");

    try {
      const reader = await askChat({
        question: q,
        stream: true,
        chatHistory: chatHistory,
      });
      appendBot("");
      scrollToBottom("auto");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // ✅ SSE는 "\n\n" 단위로 이벤트가 끝남
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const lines = evt.split("\n");
          const dataLines = lines.filter((l) => l.startsWith("data: "));
          if (!dataLines.length) continue;

          // 여러 줄 데이터일 경우 합쳐서 하나로 처리
          const payload = dataLines.map((l) => l.substring(5)).join("\n").trim();
          if (!payload) continue;

          // JSON 여부 확인
          let parsed = null;
          try {
            parsed = JSON.parse(payload);
          } catch {}

          if (parsed && typeof parsed === "object") {
            const btns = parsed.source_buttons ?? parsed.sourceButtons ?? [];
            if (Array.isArray(btns) && btns.length) setLastBotButtons(btns);
            if (parsed.chat_history) setChatHistory(parsed.chat_history);
          } else {
            // 그냥 텍스트 데이터면 그대로 출력
            const clean = cleanText(payload);
            updateLastBot(clean);
            scrollToBottom("auto");
          }
        }
      }
    } catch (streamErr) {
      if (import.meta.env.DEV)
        console.error("[chat] streaming failed:", streamErr);
      try {
        const data = await askChat({
          question: q,
          stream: false,
          chat_history: chatHistory,
        });
        appendBot(cleanText(data.answer ?? JSON.stringify(data)));
        if (data.chat_history) {
          setChatHistory(data.chat_history);
        }
        const btns = data.source_buttons ?? data.sourceButtons ?? [];
        if (Array.isArray(btns) && btns.length) {
          setLastBotButtons(btns);
        }
      } catch (err) {
        if (import.meta.env.DEV)
          console.error("[chat] fallback request failed:", err);
        appendBot("서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
      scrollToBottom("smooth");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quicks = ["이번 달 어디서 과소비 했나요?", "예산 목표 잡는 방법"];

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
        <div
          style={{
            borderBottom: "1.5px solid #000",
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#000" }}>
            추천 질문
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {quicks.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
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
            ))}
          </div>
        </div>

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
                backgroundColor: msg.type === "user" ? "#FFD858" : "#f0f0f0",
                color: "#000",
                padding: "10px 16px",
                borderRadius: "18px",
                marginBottom: "10px",
                border: "1px solid #000",
                maxWidth: "70%",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
              {msg.type === "bot" && msg.sourceButtons?.length > 0 && (
                <SourceButtonsRow buttons={msg.sourceButtons} />
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div
          style={{
            borderTop: "1.5px solid #000",
            display: "flex",
            alignItems: "center",
            background: "#fff",
            padding: "12px 20px",
            borderRadius: "0 0 18px 18px",
            gap: "10px",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "응답 생성 중…" : "메시지를 입력하세요..."}
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              margin: 0,
              padding: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "15px",
              color: "#000",
              lineHeight: "20px",
              resize: "none",
              overflow: "hidden",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            style={{
              backgroundColor: "#FFD858",
              border: "1px solid #000",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            title="보내기"
          >
            <span style={{ fontSize: "18px" }}>{loading ? "⏳" : "📨"}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ChatbotPage;
