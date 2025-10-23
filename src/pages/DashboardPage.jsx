// src/pages/DashboardPage.jsx
import { useEffect, useState, useMemo } from "react";
import BudgetCard from "../components/BudgetCard";
import MissionCard from "../components/MissionCard";
import PointCard from "../components/PointCard";
import { loadBudgets } from "../api/budget";
import { loadConsumptions } from "../api/consumption";
import { getMyPoints, getMyPointTx } from "../api/points";
import { me } from "../api/auth"; // ✅ 사용자별 미션 스토리지 키 생성을 위해 사용

// 어떤 응답 형태여도 배열로 변환 ([], {content:[]}, {data:[]}, {items:[]}, {results:[]})
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

const thisYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const labelFromReason = (value) => {
  const key = String(value ?? "").toUpperCase();

  switch (key) {
    // 일반 미션류는 전부 "미션 완료 보상"으로
    case "MISSION_REWARD":
    case "QUIZ":
    case "VISIT":
    case "BUDGET":
    case "EXPENSE":
    case "EXCHANGE":
      return "미션 완료 보상";

    // 교환(차감)
    case "REDEEM":
      return "포인트 교환";

    // 복권 표기: 과거/현재 키 모두 대응
    case "LOTTERY_REWARD":
    case "LOTTERY_DAILY":
    case "LOTTERY":
      return "복권 당첨";

    default:
      if (!value) return "포인트 변경";
      return String(value).replace(/_/g, " ");
  }
};

/* ====== 미션 연동(대시보드 ↔ 미션 탭) ====== */
const BASE_MISSIONS_KEY = "missions_state_v2";

const defaultMissions = [
  { id: 101, type: "quiz",     title: "금융 퀴즈",         desc: "오늘의 금융 상식 퀴즈 3문제 풀기", progress: 0, total: 3, point: 30, lastCompletedDate: null },
  { id: 102, type: "visit",    title: "웹 페이지 방문",     desc: "웹 페이지 방문 후 체크인 하기",       progress: 0, total: 1, point: 20, lastCompletedDate: null },
  { id: 103, type: "budget",   title: "이번달 예산 입력",   desc: "이번달 예산을 입력하고 저장하기",     progress: 0, total: 1, point: 20, lastCompletedDate: null },
  { id: 104, type: "expense",  title: "지출내역 입력",       desc: "지출 내역 1건 입력하고 저장하기",     progress: 0, total: 1, point: 20, lastCompletedDate: null },
  { id: 105, type: "exchange", title: "포인트 교환하기",     desc: "포인트 일부를 교환 처리하기",         progress: 0, total: 1, point: 10, lastCompletedDate: null },
  { id: 106, type: "lottery",  title: "복권 긁기",         desc: "오늘의 행운! 복권 긁기 (하루 1회 무료)", progress: 0, total: 1, point: 0,  lastCompletedDate: null },
];

const todayStr = () => new Date().toISOString().split("T")[0];

function normalizeForToday(list) {
  const today = todayStr();
  return (list || []).map((m) => {
    if (m.lastCompletedDate === today) return m;
    return { ...m, progress: 0, lastCompletedDate: null };
  });
}

const DashboardPage = ({ go }) => {
  /* ===== 포인트/예산/지출 상태 ===== */
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState([]); // [{delta, reason, createdAt}...]
  const [missionAchievedCount, setMissionAchievedCount] = useState(0);

  const [budgetSum, setBudgetSum] = useState(0);
  const [expenseSum, setExpenseSum] = useState(0);

  /* ===== 미션 프리뷰 상태 ===== */
  const [storageKey, setStorageKey] = useState(null); // ✅ username 없이 키만 보관
  const [missions, setMissions] = useState([]);
  const [missionsLoaded, setMissionsLoaded] = useState(false);

  /* === 사용자별 미션 스토리지 키 결정 === */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const name = await me(); // 서버가 username 문자열 반환한다고 가정
        if (!alive) return;
        const u = name || "guest";
        setStorageKey(`${BASE_MISSIONS_KEY}::${u}`);
      } catch {
        if (!alive) return;
        setStorageKey(`${BASE_MISSIONS_KEY}::guest`);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* === 스토리지에서 미션 상태 로드 === */
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          setMissions(normalizeForToday(saved));
          setMissionsLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.warn("load missions failed:", e);
    }
    // 없거나 실패하면 기본값으로
    const normalized = normalizeForToday(defaultMissions);
    setMissions(normalized);
    try { localStorage.setItem(storageKey, JSON.stringify(normalized)); } catch {
      //
    }
    setMissionsLoaded(true);
  }, [storageKey]);

  /* === 포인트 요약 + 내역 === */
  useEffect(() => {
    (async () => {
      try {
        const summary = await getMyPoints(5); // { balance, recent: [...] }
        setBalance(Number(summary.balance || 0));
        setRecentTx(Array.isArray(summary.recent) ? summary.recent : []);
      } catch (e) {
        console.warn("포인트 요약 조회 실패:", e);
        setBalance(0);
        setRecentTx([]);
      }

      try {
        const page = await getMyPointTx({ page: 0, size: 100 });
        const list = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
        const count = list.filter((t) => t.reason === "MISSION_REWARD" && Number(t.delta) > 0).length;
        setMissionAchievedCount(count);
      } catch (e) {
        console.warn("포인트 내역 조회 실패:", e);
        setMissionAchievedCount(0);
      }
    })();
  }, []);

  /* === 예산/지출 집계 === */
  useEffect(() => {
    const ym = thisYm();
    const d = new Date();
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    (async () => {
      try {
        const budgetsResp = await loadBudgets(ym);
        const budgets = asArray(budgetsResp);
        setBudgetSum(budgets.reduce((s, b) => s + Number(b.amount || 0), 0));
      } catch (e) {
        console.warn("예산 집계 실패:", e);
        setBudgetSum(0);
      }

      try {
        const consResp = await loadConsumptions({ startDate, endDate, page: 0, size: 1000 });
        const cons = asArray(consResp);
        setExpenseSum(cons.reduce((s, c) => s + Number(c.amount || 0), 0));
      } catch (e) {
        console.warn("지출 집계 실패:", e);
        setExpenseSum(0);
      }
    })();
  }, []);

  /* === PointCard용 데이터 === */
  const recentLogs = (recentTx || [])
    .slice(0, 3)
    .map((t) => ({ label: labelFromReason(t.reason), value: Number(t.delta || 0) }));

  const pointData = useMemo(
    () => ({ total: balance, logs: recentLogs }),
    [balance, recentLogs]
  );

  const budgetData = useMemo(
    () => ({ used: expenseSum, total: budgetSum }),
    [expenseSum, budgetSum]
  );

  /* === 대시보드 미션 카드: 오늘 미완료 1개 선택 === */
  const nextMission = useMemo(() => {
    if (!missionsLoaded) return null;
    // 진행중(미완료)만 필터
    const pending = missions.filter((m) => (m.progress || 0) < m.total);
    // 기본 정의 순서대로 우선순위
    const order = defaultMissions.map((m) => m.id);
    pending.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    return pending[0] || null;
  }, [missions, missionsLoaded]);

  const missionCardData = nextMission
    ? {
        title: nextMission.title,
        desc: nextMission.desc,
        progress: Number(nextMission.progress || 0),
        total: Number(nextMission.total || 1),
        reward: Number(nextMission.point || 0), // MissionCard는 숫자 p 표기
      }
    : {
        title: "오늘의 미션 완료!",
        desc: "모든 미션을 완료했어요. 내일 다시 도전해 보세요.",
        progress: 1,
        total: 1,
        reward: 0,
      };

  const goToMissions = () => go("/mission?tab=진행중");

  return (
    <section
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "60px 100px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* === 제목 === */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "8px" }}>
          내 지갑
        </h1>
        <p style={{ color: "#555", fontSize: "16px" }}>
          당신의 재정 현황을 확인하세요
        </p>
      </div>

      {/* === 상단 요약 4개 === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "50px",
        }}
      >
        {[
          { label: "보유 포인트", value: `${balance}p` },
          { label: "이번 달 지출", value: `${expenseSum.toLocaleString()}원` },
          { label: "전체 예산", value: `${budgetSum.toLocaleString()}원` },
          { label: "달성한 미션", value: `${missionAchievedCount}개` },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = "#FFD858";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#ccc";
            }}
          >
            <p style={{ color: "#777", fontSize: "14px" }}>{item.label}</p>
            <h3 style={{ fontSize: "20px", fontWeight: 600, marginTop: "8px" }}>
              {item.value}
            </h3>
          </div>
        ))}
      </div>

      {/* === 하단 카드 3개 === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          alignItems: "stretch",
        }}
      >
        <BudgetCard data={budgetData} />

        {/* ✅ 오늘 미완료 미션 프리뷰 (클릭하면 미션 탭으로 이동) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="오늘의 미션으로 이동"
          onClick={goToMissions}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToMissions();
            }
          }}
          style={{ cursor: "pointer", outline: "none", height: "100%" }}
          title="오늘의 미션으로 이동"
        >
          <MissionCard data={missionCardData} fullHeight />
        </div>

        <PointCard data={pointData} />
      </div>
    </section>
  );
};

export default DashboardPage;
