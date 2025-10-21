// src/pages/MissionPage.jsx
import { useState, useEffect } from "react";

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
const MISSIONS_KEY = "missions_state_v1";

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
  const [modalKind, setModalKind] = useState(null);     // 'quiz' | 'visit' | 'info'
  const [selectedMission, setSelectedMission] = useState(null);

  // 미션 기본 데이터 (type으로 종류 구분)
  const defaultMissions = [
    {
      id: 1,
      type: "quiz",
      title: "금융 퀴즈",
      desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
      progress: 0,
      total: 3,
      point: 30,
      lastCompletedDate: null, // "YYYY-MM-DD"
    },
    {
      id: 2,
      type: "visit",
      title: "웹 페이지 방문",
      desc: "웹 페이지 방문 후 체크인 하기",
      progress: 0,
      total: 3,
      point: 30,
      lastCompletedDate: null,
    },
    {
      id: 3,
      type: "quiz",
      title: "금융 퀴즈",
      desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
      progress: 0,
      total: 1,
      point: 30,
      lastCompletedDate: null,
    },
  ];

  // 미션 데이터 (localStorage 복원)
  const [missions, setMissions] = useState(defaultMissions);

  // 초기 로드: 저장된 미션 상태 반영
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MISSIONS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          // 기본과 병합(새로운 미션이 추가되었을 때를 대비)
          const byId = new Map(saved.map((m) => [m.id, m]));
          const merged = defaultMissions.map((d) => byId.get(d.id) ?? d);
          setMissions(merged);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 변경 시 저장
  useEffect(() => {
    try {
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
    } catch {
      /* ignore */
    }
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
    go(`/mission?tab=${encodeURIComponent(tab)}`);
  };

  // 필터링
  const filteredMissions = missions.filter((m) => {
    if (activeTab === "전체") return true;
    if (activeTab === "완료") return m.progress >= m.total;
    if (activeTab === "진행중") return m.progress < m.total;
    return true;
  });

  // 모달 열기 (오늘 이미 완료이면 안내 모달)
  const openModalForMission = (m) => {
    const today = new Date().toISOString().split("T")[0];
    if (m.progress >= m.total && m.lastCompletedDate === today) {
      setSelectedMission(m);
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
  };

  // 진행 1단계 증가 (총량 도달시 완료 처리 및 포인트 적립)
  const advanceMission = (missionId) => {
    const today = new Date().toISOString().split("T")[0];
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== missionId) return m;
        if (m.progress >= m.total && m.lastCompletedDate === today) {
          // 오늘 이미 완료
          return m;
        }
        const nextProgress = Math.min(m.progress + 1, m.total);
        // 완료 시 포인트 적립 + 완료 날짜 기록
        if (nextProgress === m.total) {
          // 오늘 처음 완료인 경우만 적립
          if (m.lastCompletedDate !== today) {
            creditPoints(m.point, "미션 완료 보상");
          }
          return { ...m, progress: nextProgress, lastCompletedDate: today };
        }
        return { ...m, progress: nextProgress };
      })
    );
  };

  // 최종 완료 처리(버튼) → 완료 시 포인트 페이지로 이동
  const finalizeMission = (missionId) => {
    const today = new Date().toISOString().split("T")[0];
    setMissions((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== missionId) return m;
        if (m.progress < m.total) {
          // 아직 미완료면 바로 완료로 올림(한 번에 완료하는 버튼 시나리오)
          creditPoints(m.point, "미션 완료 보상");
          return { ...m, progress: m.total, lastCompletedDate: today };
        }
        if (m.progress === m.total && m.lastCompletedDate !== today) {
          // 전에 완료된 상태인데 오늘은 처음 완료 시
          creditPoints(m.point, "미션 완료 보상");
          return { ...m, lastCompletedDate: today };
        }
        return m;
      });
      return updated;
    });

    closeModal();
    if (typeof go === "function") go("/point");
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
              onStep={() => advanceMission(selectedMission.id)} // 1단계 진행
              onFinish={() => finalizeMission(selectedMission.id)} // 완료 버튼
            />
          )}
          {modalKind === "visit" && (
            <VisitModal
              mission={selectedMission}
              onClose={closeModal}
              onStep={() => advanceMission(selectedMission.id)} // 방문 완료 = 1단계 진행
              onFinish={() => finalizeMission(selectedMission.id)} // 바로 완료 버튼 필요 시
            />
          )}
          {modalKind === "info" && (
            <InfoModal onClose={closeModal} title="오늘은 이미 완료했어요">
              <p style={{ color: "#555" }}>
                오늘은 이미 완료된 미션입니다. 내일 다시 도전해 보세요!
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

/* ---------------- 안내 모달(오늘 완료) ---------------- */
function InfoModal({ title = "안내", onClose, children }) {
  return (
    <div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      <div style={{ marginBottom: 12 }}>{children}</div>
      <button onClick={onClose} style={btnPrimary}>닫기</button>
    </div>
  );
}

/* ---------------- 퀴즈 모달 ---------------- */
function QuizModal({ mission, onClose, onStep, onFinish }) {
  const questions = [
    { q: "다음 중 '고정비'의 예로 가장 적절한 것은?", options: ["월세", "식비", "택시비", "카페 이용"], a: 0 },
    { q: "비상자금 권장 수준은?", options: ["1개월 생활비", "3~6개월 생활비", "12개월 생활비", "필요없음"], a: 1 },
    {
      q: "신용카드 할부 결제에 대한 설명으로 옳은 것은?",
      options: [
        "항상 무이자라서 이자 부담이 없다",
        "이자나 수수료 부담이 있을 수 있다",
        "할부는 신용점수에 영향을 전혀 주지 않는다",
        "현금영수증이 안된다",
      ],
      a: 1,
    },
  ];

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const correctCount =
    Object.keys(answers).length === questions.length
      ? questions.reduce((acc, q, i) => acc + (answers[i] === q.a ? 1 : 0), 0)
      : 0;

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      alert("모든 문항에 응답해 주세요.");
      return;
    }
    setSubmitted(true);
  };

  const handleCompleteStep = () => {
    if (correctCount >= 2) {
      onStep();   // 1단계 진행
      onClose();  // 단계 진행 후 닫기(원하면 유지 가능)
    } else {
      alert("두 문제 이상 맞춰야 진행할 수 있어요.");
    }
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {mission.title}
      </h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>

      <div style={{ textAlign: "left", marginBottom: 16 }}>
        {questions.map((q, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: 8 }}>
              Q{idx + 1}. {q.q}
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name={`q${idx}`}
                    checked={answers[idx] === oi}
                    onChange={() => setAnswers((prev) => ({ ...prev, [idx]: oi }))}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {submitted && (
              <p
                style={{
                  marginTop: 8,
                  color: answers[idx] === q.a ? "#2b8a3e" : "#c92a2a",
                  fontWeight: 700,
                }}
              >
                {answers[idx] === q.a ? "정답!" : "오답"}
              </p>
            )}
          </div>
        ))}
      </div>

      {submitted ? (
        <p style={{ marginBottom: 14 }}>
          점수: <b>{correctCount}</b> / {questions.length}
        </p>
      ) : null}

      <div>
        {!submitted ? (
          <button onClick={handleSubmit} style={btnPrimary}>
            제출
          </button>
        ) : (
          <>
            <button onClick={handleCompleteStep} style={btnPrimary}>
              진행 반영
            </button>
            <button onClick={onFinish} style={btnPrimary}>
              바로 완료
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
function VisitModal({ mission, onClose, onStep, onFinish }) {
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
    onStep();  // 1단계 진행
    onClose();
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
            방문 완료(진행 +1)
          </button>
          <button onClick={onFinish} style={btnPrimary}>
            바로 완료
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
