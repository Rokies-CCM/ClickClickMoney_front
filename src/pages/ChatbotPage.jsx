// src/pages/ChatbotPage.jsx
import { useEffect, useRef, useState } from "react";
import { askChat } from "../api/chatbot";

const cleanText = (s) => {
  if (!s) return "";
  let t = String(s);

  // 1) data 페이로드 안에 섞여 들어오는 SSE 메타 토큰 제거
  t = t.replace(/\bevent:\s*(?:start|done|end)[a-f0-9]*\b/gi, "");
  // 2) 맨 앞에 붙어오는 해시/ID 토큰 제거
  t = t.replace(/^\s*(?:start)?[a-f0-9]{8,}\s*/i, "");
  // 3) 끝에 붙는 제어 토큰 정리
  t = t.replace(/\s*(?:done|end)\s*$/i, "");

  return t.trim();
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
          (b.url && (() => {
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
  // message: { text, type: "user" | "bot", sourceButtons?: {title,url,host}[] }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 자동 스크롤 참조
  const bottomRef = useRef(null);
  const scrollToBottom = (behavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  };

  // 메시지 변경 시 하단으로
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

  // qParam이 있으면 입력창 무시하고 즉시 전송
  const handleSend = async (qParam) => {
    const q = (qParam ?? input).trim();
    if (!q || loading) return;
    setInput("");
    appendUser(q);
    setLoading(true);
    scrollToBottom("auto");

    try {
      // 스트리밍 우선
      const reader = await askChat({ question: q, stream: true });
      appendBot(""); // 누적용 빈 말풍선
      scrollToBottom("auto");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 라인 단위로 처리
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // 마지막은 불완전 청크일 수 있음

        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;

          // 화면에 보이면 안 되는 SSE 메타 라인 필터
          if (
            trimmed.startsWith(":") || // comment
            trimmed.startsWith("event:") ||
            trimmed.startsWith("id:") ||
            trimmed.startsWith("retry:")
          ) {
            continue;
          }

          if (trimmed.startsWith("data:")) {
            // 'data:' 또는 'data: ' 모두 허용
            const payload = trimmed.substring(5).trim();
            if (payload === "[DONE]") continue;

            // JSON 우선
            let parsedOk = false;
            try {
              const obj = JSON.parse(payload);
              parsedOk = true;

              // 메타(done)인지/텍스트 델타인지 구분
              const isMeta =
                obj?.usage !== undefined ||
                obj?.provider !== undefined ||
                obj?.model !== undefined ||
                obj?.source_buttons !== undefined ||
                obj?.sourceButtons !== undefined;

              if (isMeta) {
                const btns = obj.source_buttons ?? obj.sourceButtons ?? [];
                if (Array.isArray(btns) && btns.length) {
                  setLastBotButtons(btns);
                }
                // 메타에는 본문 델타 없음
              } else {
                // 일반 텍스트 델타
                const deltaRaw = obj.answerDelta ?? obj.answer ?? "";
                const delta = cleanText(deltaRaw);
                if (delta) {
                  updateLastBot(delta);
                  scrollToBottom("auto");
                }
              }
            } catch {
              // JSON 아니면 텍스트로 처리
              if (!parsedOk) {
                const delta = cleanText(payload);
                if (delta) {
                  updateLastBot(delta);
                  scrollToBottom("auto");
                }
              }
            }
          } else {
            // data: 프리픽스 없는 일반 텍스트 라인 폴백
            const delta = cleanText(trimmed);
            if (delta) {
              updateLastBot(delta);
              scrollToBottom("auto");
            }
          }
        }
      }
    } catch (streamErr) {
      if (import.meta.env.DEV) console.error("[chat] streaming failed:", streamErr);
      // 스트리밍 실패 시 JSON 폴백
      try {
        const data = await askChat({ question: q, stream: false });
        appendBot(cleanText(data.answer ?? JSON.stringify(data)));
        const btns = data.source_buttons ?? data.sourceButtons ?? [];
        if (Array.isArray(btns) && btns.length) {
          setLastBotButtons(btns);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("[chat] fallback request failed:", err);
        appendBot("서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
      scrollToBottom("smooth");
    }
  };

  // Enter: 전송 / Shift+Enter: 줄바꿈
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
      {/* 제목 */}
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

      {/* 챗봇 박스 */}
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
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#000" }}>
            추천 질문
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {quicks.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)} // 즉시 전송
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

        {/* 입력창 */}
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
            onKeyDown={handleKeyDown} // Enter 전송, Shift+Enter 줄바꿈
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
