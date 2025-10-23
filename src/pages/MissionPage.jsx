// src/pages/MissionPage.jsx
import { useState, useEffect, useRef } from "react";
import { completeMission, submitTodayQuiz, playDailyLottery } from "../api/missions"; // ✅ 복권 API 포함
import { fetchQuizBatch, submitQuizAnswer } from "../api/quiz";
import { me } from "../api/auth";

const TABS = ["전체", "완료", "진행중"];

// 해시에서 ?tab= 값만 파싱
const getTabFromHash = () => {
  const raw = window.location.hash.slice(1) || "/mission";
  const [, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const tab = params.get("tab");
  return TABS.includes(tab) ? tab : "전체";
};

// 미션 상태 키(클라이언트 보존용) - 사용자별 분리
const BASE_MISSIONS_KEY = "missions_state_v2";

// 포인트 탭 ↔ 미션 탭 브리지(사용자별로 신호 저장: 복권/교환 완료)
const BRIDGE_KEY = "mission_bridge_v1";

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

const todayStr = () => new Date().toISOString().split("T")[0];

/** 오늘 날짜 기준으로 상태 정규화(하루 단위 리셋)
 * - 오늘이 아니면 progress=0, lastCompletedDate=null
 */
function normalizeForToday(list) {
  const today = todayStr();
  return (list || []).map((m) => {
    if (m.lastCompletedDate === today) return m;
    return { ...m, progress: 0, lastCompletedDate: null };
  });
}

// 브리지 유틸(사용자별 저장)
function readBridge(username) {
  try {
    const raw = localStorage.getItem(`${BRIDGE_KEY}::${username || "guest"}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("bridge read error", e);
    return null;
  }
}
function writeBridge(username, obj) {
  try {
    localStorage.setItem(`${BRIDGE_KEY}::${username || "guest"}`, JSON.stringify(obj || {}));
  } catch (e) {
    console.warn("bridge write error", e);
  }
}

const MissionPage = ({ go }) => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState(getTabFromHash());

  // 모달/선택 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState(null); // 'quiz' | 'visit' | 'budget' | 'expense' | 'exchange' | 'lottery' | 'info'
  const [selectedMission, setSelectedMission] = useState(null);
  const [infoMessage, setInfoMessage] = useState("");

  // 사용자/스토리지
  const [username, setUsername] = useState("guest");
  const [storageKey, setStorageKey] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // 기본 미션(총 6개) — 복권 보상 표시는 카드에서 '랜덤'으로 처리
  const defaultMissions = [
    { id: 101, type: "quiz",     title: "금융 퀴즈",       desc: "오늘의 금융 상식 퀴즈 3문제 풀기", progress: 0, total: 3, point: 30, lastCompletedDate: null },
    { id: 102, type: "visit",    title: "웹 페이지 방문",   desc: "웹 페이지 방문 후 체크인 하기",     progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 103, type: "budget",   title: "이번달 예산 입력", desc: "이번달 예산을 입력하고 저장하기",   progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 104, type: "expense",  title: "지출내역 입력",     desc: "지출 내역 1건 입력하고 저장하기",   progress: 0, total: 1, point: 20, lastCompletedDate: null },
    { id: 105, type: "exchange", title: "포인트 교환하기",   desc: "포인트 일부를 교환 처리하기",       progress: 0, total: 1, point: 10, lastCompletedDate: null },
    { id: 106, type: "lottery",  title: "복권 긁기",       desc: "오늘의 행운! 복권 긁기 (하루 1회 무료)", progress: 0, total: 1, point: 0,  lastCompletedDate: null },
  ];

  const [missions, setMissions] = useState(defaultMissions);
  const finalizingRef = useRef(new Set()); // finalizeMission 중복 호출 막기
  const bridgeSyncingRef = useRef(false);  // trySyncBridge 동시 실행 막기
  
  /* === 사용자명 로드 → 스토리지 키 결정 === */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const name = await me(); // 백엔드: username 문자열
        if (!alive) return;
        const u = name || "guest";
        setUsername(u);
        setStorageKey(`${BASE_MISSIONS_KEY}::${u}`);
      } catch (e) {
        console.warn("me() failed, fallback guest", e);
        if (!alive) return;
        setUsername("guest");
        setStorageKey(`${BASE_MISSIONS_KEY}::guest`);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* === 스토리지에서 미션 상태 로드(사용자별) + 레거시 마이그레이션 === */
  useEffect(() => {
    if (!storageKey) return;
    const isGuest = !username || username === "guest";
    try {
      // 1) 사용자별 키 우선
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          const byId = new Map(saved.map((m) => [m.id, m]));
          const merged = defaultMissions.map((d) => byId.get(d.id) ?? d);
          const normalized = normalizeForToday(merged);
          setMissions(normalized);
          localStorage.setItem(storageKey, JSON.stringify(normalized)); // 동기화
          setLoaded(true);
          return;
        }
      }

      // 2) 레거시 키 마이그레이션은 guest일 때만 수행
      if (isGuest) {
        const legacyRaw = localStorage.getItem(BASE_MISSIONS_KEY);
        if (legacyRaw) {
          const saved = JSON.parse(legacyRaw);
          if (Array.isArray(saved)) {
            const byId = new Map(saved.map((m) => [m.id, m]));
            const merged = defaultMissions.map((d) => byId.get(d.id) ?? d);
            const normalized = normalizeForToday(merged);
            setMissions(normalized);
            localStorage.setItem(storageKey, JSON.stringify(normalized));
            setLoaded(true);
            return;
          }
        }
      }

      // 3) 아무것도 없으면 기본값
      const normalized = normalizeForToday(defaultMissions);
      setMissions(normalized);
      localStorage.setItem(storageKey, JSON.stringify(normalized));
      setLoaded(true);
    } catch (e) {
      console.warn("load missions failed", e);
      const normalized = normalizeForToday(defaultMissions);
      setMissions(normalized);
      try { localStorage.setItem(storageKey, JSON.stringify(normalized)); } catch (e2) { console.warn(e2); }
      setLoaded(true);
    }
  }, [storageKey, username]);

  /* === 변경 시 저장(사용자별 키) === */
  useEffect(() => {
    if (!loaded || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(missions));
    } catch (e) {
      console.warn("save missions failed", e);
    }
  }, [missions, loaded, storageKey]);

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

  // 공용: 진행률 증가 + (선택) 오늘 잠금(lastCompletedDate 세팅)
  const applyProgress = (missionId, delta, lockToday = false) => {
    const today = todayStr();
    setMissions((prev) => {
      const next = prev.map((m) => {
        if (m.id !== missionId) return m;
        const nextProgress = Math.min(m.total, (m.progress || 0) + Math.max(0, delta || 0));
        return {
          ...m,
          progress: nextProgress,
          lastCompletedDate: lockToday ? today : m.lastCompletedDate,
        };
      });
      try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) { console.warn(e); }
      return next;
    });
  };
  
    // 서버 적립 호출 + 완료 마킹(즉시 반영) — 복권 제외
  const finalizeMission = async (missionId, _reasonOverride, overridePoints = null) => {
    const m = missions.find((x) => x.id === missionId);
    if (!m || m.type === "lottery") return;

    // ✅ 이미 오늘 완료된 미션이면 API 호출하지 않고 안내만 표시
    const today = todayStr();
    if (m.lastCompletedDate === today && m.progress >= m.total) {
      setSelectedMission(m);
      setInfoMessage("오늘은 이미 완료한 미션이에요. 내일 다시 도전해 주세요!");
      setModalKind("info");
      setIsModalOpen(true);
      return;
    }

    // ✅ 같은 미션에 대해 in-flight 중복 호출 방지
    if (finalizingRef.current.has(missionId)) return;
    finalizingRef.current.add(missionId);

    try {
      const res = await completeMission({
        source: m.type,
        amount: overridePoints != null ? overridePoints : m.point,
      });
      const granted = !!res?.claimed;

      const today = todayStr();
      setMissions((prev) => {
        const next = prev.map((it) => (it.id !== missionId
          ? it
          : { ...it, progress: it.total, lastCompletedDate: today }
        ));
        try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          console.warn("localStorage sync failed (finalizeMission):", e);
        }
        return next;
      });

      setSelectedMission(m);
      if (granted) {
        const reward = overridePoints != null ? overridePoints : m.point;
        setInfoMessage(`미션 완료! +${reward}p가 적립되었어요.`);
      } else {
        setInfoMessage("오늘은 이미 완료한 미션이에요. 내일 다시 도전해 주세요!");
      }
      setModalKind("info");
      setIsModalOpen(true);
    } catch (e) {
      alert(e?.message || "미션 완료 처리에 실패했습니다.");
    } finally {
      finalizingRef.current.delete(missionId);
    }
  };

  // 복권(하루 1회 무료) 완료 처리
  const handleDailyLotteryComplete = (reward, alreadyClaimed = false) => {
    const lot = missions.find((m) => m.type === "lottery");
    if (!lot) return;
    const today = todayStr();

    setMissions((prev) => {
      const next = prev.map((m) =>
        m.type === "lottery" ? { ...m, progress: m.total, lastCompletedDate: today } : m
      );
      try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) { console.warn(e); }
      return next;
    });

    setSelectedMission(lot);
    setInfoMessage(
      alreadyClaimed
        ? "오늘의 복권은 이미 긁으셨어요. 내일 다시 도전해 주세요!"
        : `복권 결과: +${Number(reward ?? 0)}p가 적립되었어요! 🎉`
    );
    setModalKind("info");
    setIsModalOpen(true);
  };

  // 모달 열기 (오늘 이미 완료이면 안내 모달)
  const openModalForMission = (m) => {
    const today = todayStr();
    if (m.lastCompletedDate === today && m.progress >= m.total) {
      setSelectedMission(m);
      // 복권은 안내 문구를 별도로
      const msg =
        m.type === "lottery"
          ? "오늘의 복권은 이미 긁으셨어요. 내일 다시 도전해 주세요!"
          : "오늘은 이미 완료한 미션이에요. 내일 다시 도전해 주세요!";
      setInfoMessage(msg);
      setModalKind("info");
      setIsModalOpen(true);
      return;
    }
    setSelectedMission(m);
    setModalKind(m.type === "lottery" ? "lottery" : m.type); // ✅ 복권 모달 활성화
    setIsModalOpen(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
    setModalKind(null);
    setSelectedMission(null);
    setInfoMessage("");
  };

  // 퀴즈 제출 후: 정답 수만큼 진행률 증가. 누적이 total 도달하면 서버 적립 + 완료
  const handleQuizSubmitted = async (missionId, correctCount, totalCount) => {
    const current = missions.find((m) => m.id === missionId);
    if (!current) return;
    const nextProgress = Math.min(
      current.total,
      (current.progress || 0) + Math.max(0, correctCount || 0)
    );

    // 진행률 반영 + 오늘 잠금
    applyProgress(missionId, correctCount, true);

    if (nextProgress >= current.total) {
      await finalizeMission(missionId, "퀴즈 보상");
    } else {
      setSelectedMission({ ...current, progress: nextProgress });
      setInfoMessage(`퀴즈 진행률이 업데이트 되었어요. (정답 ${correctCount}/${totalCount})`);
      setModalKind("info");
      setIsModalOpen(true);
    }
  };

  // 포인트 탭 브리지 → 미션 탭 자동 동기화
  const trySyncBridge = () => {
    if (!username || !loaded) return;

    // 빠른 중복 진입 방지
    if (bridgeSyncingRef.current) return;
    bridgeSyncingRef.current = true;

    try {
      const b = readBridge(username);
      if (!b || b.date !== todayStr()) return;

      // 1) 복권 브리지
      if (b.lottery?.done && !b.lottery?.synced) {
        setMissions((prev) => {
          const today = todayStr();
          const next = prev.map((m) =>
            m.type === "lottery" ? { ...m, progress: m.total, lastCompletedDate: today } : m
          );
          try { localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            console.warn("localStorage sync failed (lottery):", e);
          }
          return next;
        });
        if (typeof b.lottery.reward === "number") {
          const lot = missions.find((m) => m.type === "lottery");
          if (lot) {
            setSelectedMission(lot);
            setInfoMessage(`복권 결과: +${b.lottery.reward}p가 적립되었어요! 🎉`);
            setModalKind("info");
            setIsModalOpen(true);
          }
        }
        writeBridge(username, { ...b, lottery: { ...b.lottery, synced: true } });
      }

      // 2) 교환 브리지
      if (b.exchange?.done && !b.exchange?.synced) {
        const ex = missions.find((m) => m.type === "exchange");
        if (ex && !(ex.lastCompletedDate === todayStr() && ex.progress >= ex.total)) {
          finalizeMission(ex.id, "포인트 교환 보상").finally(() => {
            const nb = readBridge(username) || b;
            writeBridge(username, { ...nb, exchange: { ...nb.exchange, synced: true } });
          });
        } else {
          writeBridge(username, { ...b, exchange: { ...b.exchange, synced: true } });
        }
      }
    } finally {
      bridgeSyncingRef.current = false;
    }
  };

  // 포커스/스토리지 변경 시 자동 동기화
  useEffect(() => {
    const onFocus = () => trySyncBridge();
    const onStorage = (e) => {
      if (!e.key || !username) return;
      if (e.key === `${BRIDGE_KEY}::${username}` || e.key === storageKey) {
        trySyncBridge();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    trySyncBridge();
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, loaded, storageKey, missions]);

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
          const percent = Math.round(((m.progress || 0) / m.total) * 100);
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

              {/* 진행률/완료 라벨 */}
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                {isDone ? "완료" : "진행률"}
              </p>

              {/* 진행 바 */}
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

              {/* 수치 */}
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
                  {m.type === "lottery" ? "랜덤" : `${m.point} p`}
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

          {/* ✅ 하루 1회 무료 복권: 서버 호출 */}
          {modalKind === "lottery" && (
            <LotteryModal
              mission={selectedMission}
              onClose={closeModal}
              onComplete={handleDailyLotteryComplete}
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

/* ---------------- 퀴즈 모달 (서버 출제/채점, DB 저장) ---------------- */
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
    return () => {
      alive = false;
    };
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

  const handleFinish = async () => {
    // ✅ DB에 시도/점수 저장
    try {
      const total = questions.length;
      const score = total > 0 ? Math.round((correctCount * 100) / total) : 0;
      const meta = {
        questions: questions.map((q) => ({
          id: q.question_id,
          question: q.question,
          options: q.options,
        })),
        answers,
        results,
      };
      await submitTodayQuiz({
        score,
        correctCount: correctCount,
        totalCount: total,
        passed: score >= 70,                 // 서버에서도 다시 판정하지만 명시 전달
        metaJson: JSON.stringify(meta),      // LONGTEXT 컬럼에 저장됨
      });
    } catch (e) {
      // 저장 실패해도 UX는 계속 진행 (미션 진행률 업데이트)
      console.warn("submitTodayQuiz failed:", e);
    }

    // 제출이 끝나면, 정답 수만큼 진행률 증가 (부모에서 완료/안내 처리)
    onSubmitted?.(correctCount, questions.length);
    onClose?.(); // 퀴즈 모달 닫고 부모에서 info/완료 처리
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
      // 가계부 화면이 즉시 반영하도록 알림 이벤트 발행(선택적으로 수신)
      window.dispatchEvent(new CustomEvent("budget:saved", { detail: { amount: n } }));
    } catch (e) {
      console.warn(e);
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
  const CATEGORIES = [
    "생활", "식비", "교통", "주거", "통신", "쇼핑", "카페/간식", "의료/건강", "문화/여가", "기타"
  ];

  const today = new Date().toISOString().slice(0, 10);

  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const save = () => {
    const n = Math.max(0, Math.floor(Number(amount) || 0));

    if (!category) {
      alert("카테고리를 선택해 주세요.");
      return;
    }
    if (!date) {
      alert("날짜를 선택해 주세요.");
      return;
    }
    if (n <= 0) {
      alert("0보다 큰 금액을 입력해 주세요.");
      return;
    }

    const item = {
      category,
      date: String(date).slice(0, 10),
      amount: n,
      memo: (memo || "").trim(),
    };

    try {
      // ✅ 새 포맷으로 로컬 보관(가계부 페이지가 우선적으로 동기화/업로드함)
      const KEY = "mission_expenses_v2";
      let arr = [];
      try {
        arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      } catch {
        arr = [];
      }
      arr.push(item);
      localStorage.setItem(KEY, JSON.stringify(arr));

      // ✅ 가계부 화면이 즉시 반영하도록 이벤트 발행
      window.dispatchEvent(new CustomEvent("expenses:saved", { detail: { item } }));
    } catch (e) {
      console.warn(e);
    }

    onClose?.();
    onComplete?.(); // 기존처럼 미션 완료 처리(포인트 지급 흐름) 유지
  };

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 16 }}>{mission.desc}</p>

      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
        >
          <option value="">카테고리 선택</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              textAlign: "right",
              fontSize: 16,
            }}
          />
          <span style={{ alignSelf: "center", fontWeight: 700 }}>원</span>
        </div>

        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
        />
      </div>

      <div>
        <button onClick={save} style={btnPrimary}>저장</button>
        <button onClick={onClose} style={btnText}>닫기</button>
      </div>
    </>
  );
}

/* ---------------- 교환 유도 모달 (포인트 화면에서 실제 교환 후 확인) ---------------- */
function ExchangeMissionModal({ mission, onClose, onComplete, go }) {
  const [ack, setAck] = useState(false);

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 20 }}>
        포인트 페이지에서 교환을 진행해 주세요. 완료했다면 아래 확인 버튼을 눌러 주세요.
      </p>

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

/* ---------------- 복권 모달 (하루 1회 무료 긁기) ---------------- */
function LotteryModal({ mission, onClose, onComplete }) {
  const [scratched, setScratched] = useState(false);
  const [busy, setBusy] = useState(false);

  const scratch = async () => {
  if (scratched || busy) return;
  setScratched(true);
  setBusy(true);
  try {
    // 서버에 하루 1회 복권 플레이 요청
    const res = await playDailyLottery();

    // 응답 키 양쪽 호환 (PlayLotteryResponse vs ClaimResponse)
    const reward = Number(res?.reward ?? 0);
    const already =
      !!(res?.alreadyPlayedToday ?? res?.alreadyClaimed ?? false);

    // 부모에게 결과 전달 → 부모가 같은 모달에서 info로 전환
    onComplete?.(reward, already);

    // ⛔️ onClose() 호출하지 말 것!
    // 부모가 modalKind를 "info"로 바꿔 같은 모달 안에서 안내를 띄웁니다.
  } catch (e) {
    console.warn(e);
    alert(e?.message || "복권 처리 중 오류가 발생했습니다.");
    setScratched(false);
  } finally {
    setBusy(false);
  }
};

  return (
    <>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{mission.title}</h3>
      <p style={{ color: "#555", marginBottom: 12 }}>{mission.desc}</p>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={scratch}
          style={{ ...btnPrimary, opacity: scratched ? 0.6 : 1, cursor: scratched ? "not-allowed" : "pointer" }}
          disabled={scratched || busy}
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
