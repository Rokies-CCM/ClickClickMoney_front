// src/pages/ChatbotPage.jsx
import { useEffect, useRef, useState } from "react";
import { askChat } from "../api/chatbot";

/** ------------------------------------------------------------
 * 서버/스트림에서 섞여 들어오는 잡음을 제거하고
 * 불필요한 "[근거] / 근거 요약 / 출처" 표시를 숨긴다.
 * ------------------------------------------------------------ */
const cleanText = (s) => {
  if (!s) return "";
  let t = String(s);

  // 공통 제어문자 정리
  t = t.replace(/\r/g, "");

  // 1) SSE 메타 토큰/헤더 제거
  t = t.replace(/\bdata:\s*\[DONE\]\b/gi, "");     // data: [DONE]
  t = t.replace(/\[DONE\]/gi, "");                 // [DONE]
  t = t.replace(/\b(?:id|event|retry):[^\n]*\n?/gi, ""); // id:, event:, retry:
  t = t.replace(/\b(event:\s*(?:start|end|done))\b/gi, "");
  t = t.replace(/\b(?:start)?[a-f0-9]{8,}\b/gi, "");     // 해시/ID 토큰

  // 2) 증거/근거/출처 라인 숨김 (정규식 .test + 부정(!) 추가)
  t = t
    .split("\n")
    .filter((line) =>
      !/^\s*(?:\[[^\]]*?\s*근거[^\]]*?\]|근거\s*요약|근거|출처|참고|Evidence|Sources?)\s*[-:：]/i
        .test(line.trim())
    )
    .join("\n");

  // 3) 인라인 태그/토큰 간단 정리
  t = t.replace(/\*\*/g, "");              // **볼드** 제거
  t = t.replace(/\s+\n/g, "\n");           // 줄 끝 공백 제거
  t = t.replace(/\n{3,}/g, "\n\n");        // 과도한 빈 줄 축소

  return t.trim();
};

/** 링크 버튼 렌더러 */
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
  // message: { text, type: "user" | "bot", sourceButtons?: {title,url,host}[] }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // 자동 스크롤
  const bottomRef = useRef(null);
  const scrollToBottom = (behavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  };
  useEffect(() => {
    scrollToBottom("auto");
  }, [messages]);

  // 메시지 조작
  const appendUser = (text) =>
    setMessages((prev) => [...prev, { text, type: "user" }]);

  const appendBot = (text) =>
    setMessages((prev) => [...prev, { text, type: "bot" }]);

  const updateLastBot = (delta) =>
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.type !== "bot") return [...prev, { text: delta, type: "bot" }];
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

  /** ------------------------------------------------------------
   * 하이브리드 SSE 파서:
   * 1) 기본: "\n\n" 단위 이벤트 분할
   * 2) 보조: 라인 단위 폴백(일부 서버가 개행을 자주 끊을 때)
   * ------------------------------------------------------------ */
  const processSSEChunk = (chunk, ctx) => {
    // 1) 이벤트 기준 분할
    const events = chunk.split("\n\n");
    ctx.buffer = events.pop() ?? "";

    for (const evt of events) {
      const lines = evt.split("\n");
      const dataLines = lines
        .map((l) => l.trim())
        .filter((l) => l.toLowerCase().startsWith("data:"));
      if (!dataLines.length) {
        // data: 프리픽스 없이 텍스트만 온 경우
        const plain = cleanText(lines.join("\n"));
        if (plain) {
          updateLastBot(plain);
          scrollToBottom("auto");
        }
        continue;
      }

      const payload = dataLines.map((l) => l.slice(5).trim()).join("\n").trim();
      if (!payload || payload === "[DONE]") continue;

      let parsedObj = null;
      try {
        parsedObj = JSON.parse(payload);
      } catch {
        // JSON 아니면 바로 텍스트 델타
        const delta = cleanText(payload);
        if (delta) {
          updateLastBot(delta);
          scrollToBottom("auto");
        }
        continue;
      }

      // 메타/본문 구분
      const isMeta =
        parsedObj?.usage !== undefined ||
        parsedObj?.provider !== undefined ||
        parsedObj?.model !== undefined ||
        parsedObj?.source_buttons !== undefined ||
        parsedObj?.sourceButtons !== undefined ||
        parsedObj?.chat_history !== undefined ||
        parsedObj?.chatHistory !== undefined;

      if (isMeta) {
        const btns = parsedObj.source_buttons ?? parsedObj.sourceButtons ?? [];
        if (Array.isArray(btns) && btns.length) setLastBotButtons(btns);
        const ch = parsedObj.chat_history ?? parsedObj.chatHistory;
        if (ch) setChatHistory(ch);
      } else {
        const deltaRaw =
          parsedObj.answerDelta ??
          parsedObj.delta ??
          parsedObj.content ??
          parsedObj.answer ??
          "";
        const delta = cleanText(deltaRaw);
        if (delta) {
          updateLastBot(delta);
          scrollToBottom("auto");
        }
      }
    }
  };

  const processSSEFallbackLines = (chunk) => {
    const lines = chunk.split("\n");
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (
        trimmed.startsWith(":") || // comment
        trimmed.toLowerCase().startsWith("event:") ||
        trimmed.toLowerCase().startsWith("id:") ||
        trimmed.toLowerCase().startsWith("retry:")
      ) {
        continue;
      }
      if (trimmed.toLowerCase().startsWith("data:")) {
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const obj = JSON.parse(payload);
          const isMeta =
            obj?.usage !== undefined ||
            obj?.provider !== undefined ||
            obj?.model !== undefined ||
            obj?.source_buttons !== undefined ||
            obj?.sourceButtons !== undefined ||
            obj?.chat_history !== undefined ||
            obj?.chatHistory !== undefined;

          if (isMeta) {
            const btns = obj.source_buttons ?? obj.sourceButtons ?? [];
            if (Array.isArray(btns) && btns.length) setLastBotButtons(btns);
            const ch = obj.chat_history ?? obj.chatHistory;
            if (ch) setChatHistory(ch);
          } else {
            const deltaRaw =
              obj.answerDelta ?? obj.delta ?? obj.content ?? obj.answer ?? "";
            const delta = cleanText(deltaRaw);
            if (delta) {
              updateLastBot(delta);
              scrollToBottom("auto");
            }
          }
        } catch {
          const delta = cleanText(payload);
          if (delta) {
            updateLastBot(delta);
            scrollToBottom("auto");
          }
        }
      } else {
        const delta = cleanText(trimmed);
        if (delta) {
          updateLastBot(delta);
          scrollToBottom("auto");
        }
      }
    }
  };

  const handleSend = async (qParam) => {
    const q = (qParam ?? input).trim();
    if (!q || loading) return;
    setInput("");
    appendUser(q);
    setLoading(true);
    scrollToBottom("auto");

    try {
      // 스트리밍 우선
      const reader = await askChat({
        question: q,
        stream: true,
        chatHistory: chatHistory,
      });

      appendBot(""); // 누적용 빈 말풍선
      scrollToBottom("auto");

      const decoder = new TextDecoder();
      let state = { buffer: "" };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = state.buffer + decoder.decode(value, { stream: true });
        // 1차: 이벤트 단위 파싱
        processSSEChunk(chunk, state);

        // 남은 버퍼가 라인으로만 쪼개져 들어오는 경우 보조 처리
        if (state.buffer && !state.buffer.includes("\n\n")) {
          processSSEFallbackLines(state.buffer);
          state.buffer = "";
        }
      }
    } catch (streamErr) {
      if (import.meta.env.DEV)
        console.error("[chat] streaming failed:", streamErr);

      // 스트리밍 실패 시 JSON 폴백
      try {
        const data = await askChat({
          question: q,
          stream: false,
          chatHistory: chatHistory,
        });
        appendBot(cleanText(data.answer ?? JSON.stringify(data)));
        const ch = data.chat_history ?? data.chatHistory;
        if (ch) setChatHistory(ch);
        const btns = data.source_buttons ?? data.sourceButtons ?? [];
        if (Array.isArray(btns) && btns.length) setLastBotButtons(btns);
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