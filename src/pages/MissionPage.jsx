// src/pages/MissionPage.jsx
import { useState, useEffect } from "react";
import { fetchQuizBatch, submitQuizAnswer } from "../api/quiz"; // ✅ 퀴즈 API 연동

const TABS = ["전체", "완료", "진행중"];

// 해시에서 ?tab= 값만 파싱
const getTabFromHash = () => {
  const raw = window.location.hash.slice(1) || "/mission";
  const [, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const tab = params.get("tab");
  return TABS.includes(tab) ? tab : "전체";
};

// 포인트 지갑 키 / 미션 상태 키
const WALLET_KEY = "points_wallet_v1";
const MISSIONS_KEY = "missions_state_v2"; // ← 버전업(기존 v1과 충돌 방지)

/* ---------- 포인트 적립(로컬 저장) ---------- */
function creditPoints(amount, reason = "미션 완료 보상") {
  const DEF = { current: 0, totalEarned: 0, totalUsed: 0, history: [] };
  let w = DEF;
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      w = {
        current: Number(parsed.current || 0),
        totalEarned: Number(parsed.totalEarned || 0),
        totalUsed: Number(parsed.totalUsed || 0),
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }
  } catch {
    w = DEF;
  }

  const today = new Date().toISOString().split("T")[0];
  const next = {
    ...w,
    current: w.current + Number(amount || 0),
    totalEarned: w.totalEarned + Number(amount || 0),
    history: [
      ...w.history,
      { date: today, desc: reason, change: `+${amount}p`, amount: `+${amount}` },
    ],
  };
  localStorage.setItem(WALLET_KEY, JSON.stringify(next));
}

/* ---------- 공용 버튼 스타일 ---------- */
const btnPrimary = {
  backgroundColor: "#FFD858",
  border: "1px solid #000",
  borderRadius: "8px",
  padding: "10px 20px",
  fontWeight: 700,
  cursor: "pointer",
};
const btnText = {
  background: "transparent",
  border: "none",
  marginLeft: 10,
  cursor: "pointer",
  fontWeight: 600,
};

const MissionPage = ({ go }) => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState(getTabFromHash());

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState(null);     // 'quiz' | 'visit' | 'budget' | 'expense' | 'exchange' | 'lottery' | 'info'
  const [selectedMission, setSelectedMission] = useState(null);
  const [infoMessage, setInfoMessage] = useState("");

  // 기본 미션(총 6개)
  const defaultMissions = [
    { id: 101, type: "quiz", title: "금융 퀴즈", desc: "오늘의 금융 상식 퀴즈 3문제 풀기", progress: 0, total: 3, point: 30, lastCompletedDate: null },
    { id: 102, type: "visit", title: "웹 페이지 방문", desc: "웹 페이지 방문 후 체크인 하기", progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 103, type: "budget", title: "이번달 예산 입력", desc: "이번달 예산을 입력하고 저장하기", progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 104, type: "expense", title: "지출내역 입력", desc: "지출 내역 1건 입력하고 저장하기", progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 105, type: "exchange", title: "포인트 교환하기", desc: "포인트 일부를 교환 처리하기", progress: 0, total: 1, point: 10, lastCompletedDate: null },
    { id: 106, type: "lottery", title: "복권 긁기", desc: "오늘의 행운! 복권 긁기", progress: 0, total: 1, point: 10, lastCompletedDate: null },
  ];

  const [missions, setMissions] = useState(defaultMissions);

  // 초기 로드: 저장된 미션 상태 반영
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MISSIONS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          const byId = new Map(saved.map((m) => [m.id, m]));
          const merged = defaultMissions.map((d) => byId.get(d.id) ?? d);
          setMissions(merged);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 변경 시 저장
  useEffect(() => {
    try { localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions)); }
    catch { /* ignore */ }
  }, [missions]);

  // 해시 변경될 때 탭 동기화
  useEffect(() => {
    const onHash = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // 탭 클릭 시 상태 + URL 해시 동기화
  const handleTab = (tab) => {
    setActiveTab(tab);
    if (typeof go === "function") go(`/mission?tab=${encodeURIComponent(tab)}`);
  };

  // 필터링
  const filteredMissions = missions.filter((m) => {
    if (activeTab === "전체") return true;
    if (activeTab === "완료") return m.progress >= m.total;
    if (activeTab === "진행중") return m.progress < m.total;
    return true;
  });

  const todayStr = () => new Date().toISOString().split("T")[0];

  // 공용: 진행률 증가 + (선택) 오늘 잠금
  const applyProgress = (missionId, delta, lockToday = false) => {
    const today = todayStr();
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== missionId) return m;
        const nextProgress = Math.min(m.total, m.progress + Math.max(0, delta || 0));
        return {
          ...m,
          progress: nextProgress,
          lastCompletedDate: lockToday ? today : m.lastCompletedDate,
        };
      })
    );
  };

  // MissionPage 컴포넌트 내부: finalizeMission 교체
  const finalizeMission = (missionId, reasonOverride, overridePoints = null) => {
    const today = new Date().toISOString().split("T")[0];
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== missionId) return m;
        if (m.lastCompletedDate === today && m.progress >= m.total) return m; // 오늘 이미 완료
        // ✅ 포인트: overridePoints가 오면 그 값으로, 아니면 기본 m.point
        creditPoints(
          overridePoints != null ? overridePoints : m.point,
          reasonOverride || "미션 완료 보상"
        );
        return { ...m, progress: m.total, lastCompletedDate: today };
      })
    );
    setInfoMessage("미션이 완료되었습니다! 포인트가 적립되었어요.");
    setModalKind("info");
    setIsModalOpen(true);
  };


  // 모달 열기 (오늘 이미 완료이면 안내 모달)
  const openModalForMission = (m) => {
    const today = todayStr();
    if (m.lastCompletedDate === today) {
      setSelectedMission(m);
      setInfoMessage("오늘은 이미 진행/완료한 미션이에요. 내일 다시 도전해 주세요!");
      setModalKind("info");
      setIsModalOpen(true);
      return;
    }
    setSelectedMission(m);
    setModalKind(m.type);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
    setModalKind(null);
    setSelectedMission(null);
    setInfoMessage("");
  };

  // 퀴즈 제출 후(하루 1회 잠금): 정답 개수만큼 진행률 증가 + 오늘 잠금 + 안내 모달
  const handleQuizSubmitted = (missionId, correctCount, totalCount) => {
    // 진행률 반영(최대 total)
    applyProgress(missionId, correctCount, true);
    // 제출 후에는 오늘 재도전 불가 안내
    setInfoMessage(`오늘의 퀴즈를 완료했어요. (정답 ${correctCount}/${totalCount}) 내일 다시 도전해 주세요!`);
    setSelectedMission((prev) => prev && { ...prev, progress: Math.min(prev.total, (prev.progress || 0) + correctCount) });
    setModalKind("info");
    setIsModalOpen(true);
  };

  // 카드 키보드 접근성
  const onCardKeyDown = (e, m) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModalForMission(m);
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "40px 60px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* === 제목 === */}
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "8px",
            marginLeft: "80px",
          }}
        >
          미션
        </h1>
        <p style={{ color: "#555", fontSize: "15px", marginLeft: "80px" }}>
          미션을 완료하고 포인트를 획득하세요.
        </p>
      </div>

      {/* === 탭 메뉴 === */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          marginLeft: "80px",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTab(tab)}
            style={{
              background: activeTab === tab ? "#000" : "rgba(0,0,0,0.05)",
              color: activeTab === tab ? "#fff" : "#000",
              border: "none",
              borderRadius: "20px",
              padding: "8px 22px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* === 미션 카드 영역 === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          justifyItems: "center",
          alignItems: "start",
          gap: "70px",
          width: "100%",
          maxWidth: "1100px",
          margin: "10px auto 0",
        }}
      >
        {filteredMissions.map((m) => {
          const percent = Math.round((m.progress / m.total) * 100);
          const isDone = percent >= 100;

          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => openModalForMission(m)}
              onKeyDown={(e) => onCardKeyDown(e, m)}
              style={{
                width: "320px",
                minHeight: "260px",
                border: "1.5px solid #000",
                borderRadius: "12px",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: "#fff",
                transition: "transform .25s ease, box-shadow .25s ease",
                marginRight: "10px",
                cursor: "pointer",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* 상단 상태 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{m.title}</h3>
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "10px",
                    backgroundColor: "#FFD858",
                    border: "1px solid #000",
                    fontWeight: 600,
                  }}
                >
                  {isDone ? "완료" : "진행중"}
                </span>
              </div>

              {/* 설명 */}
              <p style={{ fontSize: "14px", color: "#444", marginBottom: "10px" }}>
                {m.desc}
              </p>

              {/* 진행률 */}
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                진행률
              </p>
              <div
                style={{
                  backgroundColor: "#eee",
                  height: "8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    backgroundColor: "#000",
                    transition: "width .25s ease",
                  }}
                />
              </div>
              <p style={{ fontSize: "13px", color: "#555" }}>
                {m.progress}/{m.total}
              </p>

              {/* 하단 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "14px",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                  {m.point} p
                </span>
                <span style={{ fontSize: 12, color: "#666" }}>자세히 보기 ▸</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* === 미션 모달 === */}
      {isModalOpen && selectedMission && (
        <Modal onClose={closeModal}>
          {modalKind === "quiz" && (
            <QuizModal
              mission={selectedMission}
              onClose={closeModal}
              onSubmitted={(correct, total) =>
                handleQuizSubmitted(selectedMission.id, correct, total)
              }
            />
          )}

          {modalKind === "visit" && (
            <VisitModal
              mission={selectedMission}
              onClose={closeModal}
              onComplete={() => finalizeMission(selectedMission.id, "웹 방문 보상")}
            />
          )}

          {modalKind === "budget" && (
            <BudgetModal
              mission={selectedMission}
              onClose={closeModal}
              onComplete={() => finalizeMission(selectedMission.id, "예산 입력 보상")}
            />
          )}

          {modalKind === "expense" && (
            <ExpenseModal
              mission={selectedMission}
              onClose={closeModal}
              onComplete={() => finalizeMission(selectedMission.id, "지출 입력 보상")}
            />
          )}

          {modalKind === "exchange" && (
            <ExchangeMissionModal
              mission={selectedMission}
              onClose={closeModal}
              onComplete={() => finalizeMission(selectedMission.id, "포인트 교환 보상")}
              go={go}
            />
          )}

          {modalKind === "lottery" && (
            <LotteryModal
              mission={selectedMission}
              onClose={closeModal}
              // 랜덤 보상 포인트를 finalizeMission에 전달
              onComplete={(reward) =>
                finalizeMission(
                  selectedMission.id,
                  `복권 긁기 보상 (+${reward}p)`,
                  reward
                )
              }
            />
          )}


          {modalKind === "info" && (
            <InfoModal onClose={closeModal} title="안내">
              <p style={{ color: "#555" }}>
                {infoMessage || "오늘은 이미 완료된 미션입니다. 내일 다시 도전해 보세요!"}
              </p>
            </InfoModal>
          )}
        </Modal>
      )}
    </section>
  );
};

export default MissionPage;

/* ---------------- 공용 Modal ---------------- */
function Modal({ children, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          padding: "40px 60px",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
          minWidth: 420,
          maxWidth: 640,
          width: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* ✕ 닫기 버튼 */}
        <button
          onClick={onClose}
          aria-label="닫기"
          title="닫기"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#fff",
            border: "1px solid #000",
            cursor: "pointer",
            lineHeight: "30px",
            fontSize: 16,
          }}
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}

/* ---------------- 안내 모달 ---------------- */
function InfoModal({ title = "안내", onClose, children }) {
  return (
    <div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      <div style={{ marginBottom: 12 }}>{children}</div>
      <button onClick={onClose} style={btnPrimary}>닫기</button>
    </div>
  );
}

/* ---------------- 퀴즈 모달 (하루 1회, 정답수만큼 진행률) ---------------- */
function QuizModal({ mission, onClose, onSubmitted }) {
  // 서버에서 내려온 문제들
  const [questions, setQuestions] = useState([]); // [{question_id, question, options:{A..D}, ...}]
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 사용자가 고른 답 (question_id -> "A"|"B"|"C"|"D")
  const [answers, setAnswers] = useState({});
  // 채점 결과 (question_id -> {is_correct, correct_key, explanation, points_awarded, streak})
  const [results, setResults] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        // 태그 예시: quiz는 "points"로
        const tag = mission?.type === "quiz" ? "points" : null;
        const qs = await fetchQuizBatch(tag);
        if (!alive) return;
        setQuestions(qs || []);
        setAnswers({});
        setResults({});
        setSubmitted(false);
      } catch (e) {
        if (!alive) return;
        setLoadError(e?.message || "문제를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [mission]);

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => typeof answers[q.question_id] === "string");

  const correctCount = Object.values(results).reduce(
    (acc, r) => acc + (r?.is_correct ? 1 : 0),
    0
  );

  const handleSubmit = async () => {
    if (!allAnswered) {
      alert("모든 문항에 응답해 주세요.");
      return;
    }
    try {
      const graded = {};
      await Promise.all(
        questions.map(async (q) => {
          const userAns = answers[q.question_id];
          const r = await submitQuizAnswer(q.question_id, userAns);
          graded[q.question_id] = r;
        })
      );
      setResults(graded);
      setSubmitted(true);
    } catch (e) {
      alert(e?.message || "채점 중 오류가 발생했습니다.");
    }
  };

  const handleFinish = () => {
    // 제출이 끝나면, 정답 개수만큼 진행률 증가 + 오늘 잠금 + 안내 모달
    onSubmitted?.(correctCount, questions.length);
    onClose?.(); // 퀴즈 모달 닫고, 부모에서 안내 모달 오픈
  };

  const setAnswer = (qid, choice) => {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
  };

  if (loading) {
    return (
      <>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          {mission.title}
        </h3>
        <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>
        <p>문제를 불러오는 중...</p>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          {mission.title}
        </h3>
        <p style={{ color: "#c92a2a" }}>{loadError}</p>
        <button onClick={onClose} style={btnText}>닫기</button>
      </>
    );
  }

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {mission.title}
      </h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>

      <div style={{ textAlign: "left", marginBottom: 16 }}>
        {questions.map((q, idx) => {
          const letters = ["A", "B", "C", "D"];
          return (
            <div
              key={q.question_id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <p style={{ fontWeight: 700, marginBottom: 8 }}>
                Q{idx + 1}. {q.question}
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {letters.map((L) => (
                  <label
                    key={L}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.question_id}`}
                      checked={answers[q.question_id] === L}
                      onChange={() => setAnswer(q.question_id, L)}
                    />
                    <span>{q.options?.[L]}</span>
                  </label>
                ))}
              </div>

              {submitted && results[q.question_id] && (
                <p
                  style={{
                    marginTop: 8,
                    color: results[q.question_id].is_correct ? "#2b8a3e" : "#c92a2a",
                    fontWeight: 700,
                  }}
                >
                  {results[q.question_id].is_correct
                    ? `정답! (+${results[q.question_id].points_awarded}p)`
                    : `오답 (정답: ${results[q.question_id].correct_key})`}
                  <br />
                  <span style={{ fontWeight: 400, color: "#555" }}>
                    {results[q.question_id].explanation}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {submitted && (
        <p style={{ marginBottom: 14 }}>
          맞춘 개수: <b>{correctCount}</b> / {questions.length}
        </p>
      )}

      <div>
        {!submitted ? (
          <button onClick={handleSubmit} style={btnPrimary}>
            제출
          </button>
        ) : (
          <>
            <button onClick={handleFinish} style={btnPrimary}>
              완료
            </button>
            <button onClick={onClose} style={btnText}>
              닫기
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ---------------- 방문 모달 ---------------- */
function VisitModal({ mission, onClose, onComplete }) {
  const [visited, setVisited] = useState(false);

  const handleVisit = () => {
    window.open("https://www.naver.com", "_blank", "noopener,noreferrer");
    setVisited(true);
  };

  const handleDone = () => {
    if (!visited) {
      alert("먼저 '새 탭으로 방문'을 눌러 페이지를 방문해 주세요.");
      return;
    }
    onClose?.();
    onComplete?.();
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {mission.title}
      </h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        <p style={{ marginBottom: 8 }}>
          아래 버튼을 눌러 페이지를 방문한 뒤, “방문 완료”를 눌러주세요.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleVisit} style={btnPrimary}>
            새 탭으로 방문
          </button>
          <button onClick={handleDone} style={btnPrimary}>
            방문 완료
          </button>
          <button onClick={onClose} style={btnText}>
            닫기
          </button>
        </div>
        {!visited && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#c92a2a" }}>
            방문 확인 후에만 완료할 수 있어요.
          </p>
        )}
      </div>
    </>
  );
}

/* ---------------- 이번달 예산 입력 모달 ---------------- */
function BudgetModal({ mission, onClose, onComplete }) {
  const [amount, setAmount] = useState("");

  const save = () => {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) {
      alert("0보다 큰 금액을 입력해 주세요.");
      return;
    }
    try {
      localStorage.setItem("budget_current_month", String(n));
    } catch {
      //ignore
    }
    onClose?.();
    onComplete?.();
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0}
          step={1}
          placeholder="이번달 예산 (원)"
          style={{
            width: 200,
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            textAlign: "right",
            fontSize: 16,
          }}
        />
        <span style={{ alignSelf: "center", fontWeight: 700 }}>원</span>
      </div>
      <div>
        <button onClick={save} style={btnPrimary}>저장</button>
        <button onClick={onClose} style={btnText}>닫기</button>
      </div>
    </>
  );
}

/* ---------------- 지출내역 입력 모달 ---------------- */
function ExpenseModal({ mission, onClose, onComplete }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const save = () => {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (!title.trim()) {
      alert("지출 항목을 입력해 주세요.");
      return;
    }
    if (n <= 0) {
      alert("0보다 큰 금액을 입력해 주세요.");
      return;
    }
    try {
      const raw = localStorage.getItem("expenses") || "[]";
      const arr = JSON.parse(raw);
      arr.push({ title: title.trim(), amount: n, date: new Date().toISOString().slice(0, 10) });
      localStorage.setItem("expenses", JSON.stringify(arr));
    } catch {
      //
    }
    onClose?.();
    onComplete?.();
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="지출 항목"
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step={1}
            placeholder="금액"
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ccc", textAlign: "right", fontSize: 16 }}
          />
          <span style={{ alignSelf: "center", fontWeight: 700 }}>원</span>
        </div>
      </div>
      <div>
        <button onClick={save} style={btnPrimary}>저장</button>
        <button onClick={onClose} style={btnText}>닫기</button>
      </div>
    </>
  );
}

// ExchangeMissionModal 교체
function ExchangeMissionModal({ mission, onClose, onComplete, go }) {
  const [ack, setAck] = useState(false);

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 20 }}>
        포인트 페이지에서 교환을 진행해 주세요. 완료했다면 아래 확인 버튼을 눌러 주세요.
      </p>

      {/* ✅ 가로 한 줄 배치 */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
        <button
          style={{ ...btnPrimary, whiteSpace: "nowrap" }}
          onClick={() => {
            if (typeof go === "function") go("/point");
            setAck(true);
          }}
        >
          포인트 페이지로 이동
        </button>

        <button
          style={{
            ...btnPrimary,
            opacity: ack ? 1 : 0.5,
            cursor: ack ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
          onClick={() => {
            if (!ack) {
              alert("먼저 포인트 페이지로 이동해 교환을 진행해 주세요.");
              return;
            }
            onClose?.();
            onComplete?.();
          }}
          disabled={!ack}
        >
          교환 완료 확인
        </button>

        <button onClick={onClose} style={{ ...btnText, whiteSpace: "nowrap" }}>
          닫기
        </button>
      </div>
    </>
  );
}

// LotteryModal 교체
function LotteryModal({ mission, onClose, onComplete }) {
  const [scratched, setScratched] = useState(false);

  const scratch = () => {
    if (scratched) return;
    setScratched(true);
    // ✅ 0~50p 보상
    const reward = Math.floor(Math.random() * 51);
    alert(`복권 결과: ${reward}p가 적립됩니다! 🎉`);
    // ✅ 긁는 즉시 완료 처리(오늘 잠금) + 모달 닫기
    onComplete?.(reward);
    onClose?.();
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 12 }}>{mission.desc}</p>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={scratch}
          style={{ ...btnPrimary, opacity: scratched ? 0.6 : 1, cursor: scratched ? "not-allowed" : "pointer" }}
          disabled={scratched}
        >
          {scratched ? "오늘은 이미 긁었어요" : "복권 긁기"}
        </button>
      </div>

      <div>
        <button onClick={onClose} style={btnText}>닫기</button>
      </div>
    </>
  );
}

