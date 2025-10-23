// src/pages/AccountBookPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  loadRange,     // 기간 조회
  saveMany,      // 여러 건 저장
  updateOne,     // 단건 수정
  deleteOne      // 단건 삭제
} from "../api/consumption";
import { loadBudgets, upsertBudget } from "../api/budget";
import { upsertMemo, loadMemo } from "../api/memo";
import { generateTips } from "../api/tips";          // ✅ AI 절약 팁 호출
import UploadCSV from "../components/accountbook/UploadCSV"; // CSV 업로드 버튼

const DEFAULT_BUDGET_CATEGORY = "전체"; // 백엔드 category 필수 대응
const MEMO_PREFETCH_LIMIT = 300;        // 월 조회 후 선로딩 최대 건수(과도한 호출 방지)
const SUBSCRIPTION_CATEGORY_NAME = "구독"; // ✅ 정기결제 카테고리

// 🔑 미션-로컬 키(신규 우선, 레거시도 지원)
const LS_MISSION_EXPENSES_V2 = "mission_expenses_v2"; // [{category,date,amount,memo}]
const LS_MISSION_EXPENSES_V1 = "expenses";            // [{title,amount,date}] (레거시)

/* -------------------- 유틸 -------------------- */
// 어떤 응답 형태여도 배열로 변환
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

// YYYY-MM 문자열 ↔ Date
const ymToDate = (ymStr) => {
  const [y, m] = ymStr.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, 1);
};
const dateToYm = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// 서버에서 내려오는 다양한 키들을 화면 표준 키로 정규화
const normalizeConsumption = (raw) => {
  const x = raw ?? {};
  const id =
    x.id ?? x.consumptionId ?? x.seq ?? x.pk ?? x._id ?? null;

  const category =
    (typeof x.category === "string" ? x.category : null) ??
    x.categoryName ?? x.cat ?? x.type ?? x.consumptionCategory ??
    (typeof x.category === "object" ? (x.category?.name ?? x.category?.label ?? x.category?.title) : null) ??
    "";

  const dateRaw =
    x.date ?? x.useDate ?? x.spentDate ?? x.paymentDate ??
    x.createdDate ?? x.created_at ?? x.createdAt ?? "";
  const date = typeof dateRaw === "string" ? dateRaw.slice(0, 10) : "";

  const amountRaw = x.amount ?? x.price ?? x.money ?? x.cost ?? x.value ?? 0;
  const amount = Number(amountRaw ?? 0);

  const memo = x.memo ?? x.description ?? x.note ?? x.desc ?? "";

  return { ...x, id, category, date, amount, memo };
};

// JSON/문자열/배열 어떤 형태여도 안전하게 "메모 문자열"만 추출
const safeExtractMemo = (resp) => {
  const pick = (obj) => {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) return pick(obj[0] ?? "");
    if (typeof obj === "object") {
      if (Array.isArray(obj.data)) return pick(obj.data[0] ?? "");
      if (Array.isArray(obj.results)) return pick(obj.results[0] ?? "");
      if (Array.isArray(obj.items)) return pick(obj.items[0] ?? "");
      const v =
        obj.memo ?? obj.value ?? obj.text ?? obj.message ??
        obj.data?.memo ?? obj.data?.value ?? "";
      return typeof v === "string" ? v : String(v ?? "");
    }
    return String(obj);
  };
  return String(pick(resp)).trim();
};

/** 문자열 날짜(YYYY-MM-DD) + n개월 */
const addMonths = (ds, n = 1) => {
  if (!ds) return "";
  const [y, m, d] = ds.split("-").map((v) => parseInt(v, 10));
  const base = new Date(y, (m || 1) - 1, d || 1);
  base.setMonth(base.getMonth() + n);
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${base.getFullYear()}-${mm}-${dd}`;
};

export default function AccountBookPage() {
  /* -------- Month state -------- */
  const initYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [ym, setYm] = useState(initYm()); // "YYYY-MM"

  /* -------- Data state -------- */
  const [expenses, setExpenses] = useState([]);       // 현재 월 지출 (정규화 배열)
  const [budgetsList, setBudgetsList] = useState([]); // 현재 월 예산(카테고리별)
  const [memoMap, setMemoMap] = useState({});         // id(문자열) → memo 캐시

  /* -------- Derived -------- */
  const monthlyBudget = useMemo(() => {
    const list = asArray(budgetsList);
    return list.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  }, [budgetsList]);

  const totalExpense = useMemo(() => {
    const list = asArray(expenses);
    return list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  // 카테고리 합계 (AI 팁/요약 카드에 사용)
  const byCategory = useMemo(() => {
    const acc = {};
    for (const cur of asArray(expenses)) {
      const key = cur.category || "기타";
      acc[key] = (acc[key] || 0) + Number(cur.amount || 0);
    }
    return Object.entries(acc).map(([name, amount]) => ({ name, amount }));
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (!byCategory.length) return null;
    const sorted = [...byCategory].sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((s, x) => s + x.amount, 0) || 1;
    return {
      name: sorted[0].name || "기타",
      pct: Math.round((sorted[0].amount / total) * 100),
    };
  }, [byCategory]);

  const dailyTotals = useMemo(() => {
    const acc = {};
    for (const cur of asArray(expenses)) {
      const key = cur.date;
      if (!key) continue;
      acc[key] = (acc[key] || 0) + Number(cur.amount || 0);
    }
    return acc;
  }, [expenses]);

  /* -------- ✅ 월 구독 항목 파생/요약 -------- */
  const subscriptionsThisMonth = useMemo(() => {
    const subs = asArray(expenses).filter((e) => (e.category || "") === SUBSCRIPTION_CATEGORY_NAME);
    // 메모 병합
    const withMemo = subs.map((e) => {
      const memoText =
        memoMap[String(e.id)] ??
        memoMap[e.id] ??
        e.memo ?? e.description ?? e.note ?? e.desc ?? "";
      return { ...e, memo: memoText };
    });

    // 벤더/서비스 키 (메모 기반 간단 추정)
    const serviceKey = (txt) => {
      const t = String(txt || "").trim().toLowerCase();
      if (!t) return "";
      // 메모 첫 토큰 정도만 그룹 키로 사용
      return t.split(/[\s\u2013_:|,·/-]+/)[0] || t;
    };

    const byService = new Map();
    for (const it of withMemo) {
      const key = serviceKey(it.memo) || `id-${it.id}`;
      const cur = byService.get(key) || [];
      cur.push(it);
      byService.set(key, cur);
    }

    let monthTotal = 0;
    const groups = [];
    for (const [k, arr] of byService.entries()) {
      const total = arr.reduce((s, x) => s + Number(x.amount || 0), 0);
      monthTotal += total;
      const latest = [...arr].sort((a, b) => (a.date > b.date ? -1 : 1))[0];
      groups.push({
        key: k,
        total,
        count: arr.length,
        latestDate: latest?.date || "",
        nextBillingDate: addMonths(latest?.date || "", 1),
        items: arr
      });
    }

    // 중복 감지: 같은 서비스키에서 같은 달에 2건 이상
    const duplicates = groups.filter((g) => g.count >= 2);
    // 절감 가능액: 각 중복 그룹에서 최댓값만 유지하고 나머지 합
    const savableAmount = duplicates.reduce((sum, g) => {
      const amounts = g.items.map((x) => Number(x.amount || 0));
      const maxKeep = Math.max(...amounts);
      const others = amounts.reduce((s, v) => s + v, 0) - maxKeep;
      return sum + Math.max(0, others);
    }, 0);

    return {
      list: withMemo,                       // 구독 항목 원본 목록(메모 병합)
      groups,                               // 서비스 단위 그룹
      monthTotal,                           // 월 구독 총액
      activeCount: groups.length,           // 활성 구독 수 (서비스 기준)
      duplicates,                           // 중복 그룹
      savableAmount                         // 절감 가능액(규칙 기반)
      // unused: []   // 과거 사용 로그 없으면 판단 어렵기 때문에 제외(원하면 규칙 추가)
    };
  }, [expenses, memoMap]);

  /* -------- Modal/Input state -------- */
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    id: null,
    category: "",
    date: "",
    amount: "",
    memo: "",
  });
  const [editingIndex, setEditingIndex] = useState(null);

  /* -------- AI 절약 팁 (자동 생성) -------- */
  const [aiTips, setAiTips] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // ✅ 카테고리에 '구독' 추가 (배열 맨 뒤: 기존 인덱스→ID 규칙 보존)
  const categories = [
    "생활", "식비", "교통", "주거", "통신", "쇼핑", "카페/간식", "의료/건강", "문화/여가", "기타",
    SUBSCRIPTION_CATEGORY_NAME
  ];

  /* -------- Month navigation -------- */
  const moveMonth = (delta) => {
    const d = ymToDate(ym);
    d.setMonth(d.getMonth() + delta);
    setYm(dateToYm(d));
  };

  // Calendar calc
  const curDate = ymToDate(ym);
  const year = curDate.getFullYear();
  const monthIndex = curDate.getMonth(); // 0-11
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  /* -------- Memo helpers -------- */
  const fetchMemoAndPatch = async (cid) => {
    try {
      const resp = await loadMemo(cid);
      const val = safeExtractMemo(resp);

      setNewExpense((prev) =>
        (prev && String(prev.id) === String(cid)) ? { ...prev, memo: val } : prev
      );

      setExpenses((prev) =>
        asArray(prev).map((x) =>
          String(x.id) === String(cid) ? { ...x, memo: val } : x
        )
      );

      setMemoMap((prev) => ({ ...prev, [String(cid)]: val }));
    } catch (err) {
      console.warn("[memo:get] failed", cid, err);
      setMemoMap((prev) => ({ ...prev, [String(cid)]: "" }));
    }
  };

  // 🧩 보조: 월 범위 재조회 후 (category,date,amount)로 최신 항목을 찾아 id 매칭
  const findLatestMatchingId = async ({ category, date, amount }, usedIds = new Set()) => {
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
    try {
      const fresh = await loadRange(startDate, endDate, { page: 0, size: 1000 });
      const list = asArray(fresh).map(normalizeConsumption)
        .filter(x =>
          x.category === String(category) &&
          x.date === String(date).slice(0, 10) &&
          Number(x.amount) === Number(amount)
        )
        .sort((a, b) => (Number(b.id || 0) - Number(a.id || 0)));
      for (const cand of list) {
        const cid = cand?.id;
        if (cid != null && !usedIds.has(String(cid))) {
          return cid;
        }
      }
    } catch (e) {
      console.warn("[match] findLatestMatchingId failed:", e);
    }
    return null;
  };

  /* -------- 서버 로드 -------- */
  const fetchMonthExpenses = async () => {
    const startDate = `${ym}-01`;
    const endDate = `${ym}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
    try {
      const list = await loadRange(startDate, endDate, { page: 0, size: 1000 });
      const arr = asArray(list).map(normalizeConsumption);
      setExpenses(arr);

      // ⚡ 메모 선로딩
      const idsToFetch = arr
        .map((x) => x?.id)
        .filter((id) => id != null && memoMap[String(id)] === undefined)
        .slice(0, MEMO_PREFETCH_LIMIT);

      if (idsToFetch.length) {
        const results = await Promise.allSettled(
          idsToFetch.map(async (cid) => {
            const r = await loadMemo(cid);
            return [cid, safeExtractMemo(r)];
          })
        );
        const patch = {};
        for (const r of results) {
          if (r.status === "fulfilled") {
            const [cid, val] = r.value;
            patch[String(cid)] = val;
          }
        }
        if (Object.keys(patch).length) {
          setMemoMap((prev) => ({ ...prev, ...patch }));
        }
      }
    } catch (err) {
      console.warn("지출 조회 실패:", err);
      alert("지출 조회에 실패했어요.");
      setExpenses([]);
    }
  };

  const fetchMonthBudgets = async () => {
    try {
      const list = await loadBudgets(ym); // [{id, month, category, amount}]
      setBudgetsList(asArray(list));
    } catch (err) {
      console.warn("예산 조회 실패:", err);
      alert("예산 조회에 실패했어요.");
      setBudgetsList([]);
    }
  };

  /* -------- ✅ 미션 로컬 스토리지 → 백엔드 동기화 -------- */
  const syncArtifactsFromMissionLocal = async () => {
    // 1) 예산: budget_current_month
    try {
      const raw = localStorage.getItem("budget_current_month");
      if (raw != null) {
        const amount = Math.floor(Number(raw) || 0);
        if (amount > 0) {
          await upsertBudget({ month: ym, category: DEFAULT_BUDGET_CATEGORY, amount });
        }
        localStorage.removeItem("budget_current_month");
      }
    } catch (e) {
      console.warn("[mission-sync] budget sync failed:", e);
    }

    // 2-1) 신규 포맷: mission_expenses_v2
    try {
      const raw2 = localStorage.getItem(LS_MISSION_EXPENSES_V2);
      if (raw2 != null) {
        let arr = [];
        try { arr = JSON.parse(raw2); } catch { arr = []; }
        const targets = Array.isArray(arr)
          ? arr.filter((x) =>
              x && typeof x === "object" &&
              String(x.date || "").startsWith(ym) &&
              Number(x.amount) > 0 &&
              (x.category || "").trim() !== ""
            )
          : [];

        if (targets.length) {
          const toCreate = targets.map(x => ({
            category: String(x.category),
            amount: Math.floor(Number(x.amount)),
            date: String(x.date).slice(0, 10)
          }));

          let created = null;
          try {
            created = await saveMany(toCreate);
          } catch (e) {
            console.warn("[mission-sync] saveMany(v2) failed:", e);
          }

          const usedIds = new Set();
          if (Array.isArray(created) && created.length) {
            for (let i = 0; i < Math.min(created.length, targets.length); i++) {
              const cid = created[i]?.id;
              const memoText = (targets[i]?.memo ?? "").trim();
              if (cid != null) usedIds.add(String(cid));
              if (cid != null && memoText) {
                try { await upsertMemo(cid, memoText); } catch (e) { console.warn("[mission-sync] upsertMemo(v2) failed:", e); }
              }
            }
          }

          const needFallback = !Array.isArray(created) || created.length < targets.length;
          if (needFallback) {
            for (let i = 0; i < targets.length; i++) {
              const memoText = (targets[i]?.memo ?? "").trim();
              if (!memoText) continue;
              const matchPayload = {
                category: String(targets[i].category),
                date: String(targets[i].date).slice(0, 10),
                amount: Math.floor(Number(targets[i].amount))
              };
              const matchedId = await findLatestMatchingId(matchPayload, usedIds);
              if (matchedId != null) {
                usedIds.add(String(matchedId));
                try { await upsertMemo(matchedId, memoText); } catch (e) { console.warn("[mission-sync] fallback upsertMemo(v2) failed:", e); }
              }
            }
          }
        }
        localStorage.removeItem(LS_MISSION_EXPENSES_V2);
      }
    } catch (e) {
      console.warn("[mission-sync] expense v2 sync failed:", e);
    }

    // 2-2) 레거시 포맷: expenses
    try {
      const raw = localStorage.getItem(LS_MISSION_EXPENSES_V1);
      if (raw != null) {
        let arr = [];
        try { arr = JSON.parse(raw); } catch { arr = []; }
        const targets = Array.isArray(arr)
          ? arr.filter((x) => x && typeof x === "object" && String(x.date || "").startsWith(ym))
          : [];

        const payload = targets
          .map((x) => ({
            category: "기타",
            amount: Math.floor(Number(x.amount) || 0),
            date: String(x.date || "").slice(0, 10),
            __title: (x.title || "").trim(),
          }))
          .filter((p) => p.amount > 0 && p.date);

        if (payload.length) {
          let created = null;
          try {
            created = await saveMany(payload.map(({ category, amount, date }) => ({ category, amount, date })));
          } catch (e) {
            console.warn("[mission-sync] saveMany(v1) failed:", e);
          }

          const usedIds = new Set();
          if (Array.isArray(created) && created.length) {
            for (let i = 0; i < Math.min(created.length, payload.length); i++) {
              const cid = created[i]?.id;
              const memoText = payload[i]?.__title;
              if (cid != null) usedIds.add(String(cid));
              if (cid != null && memoText) {
                try { await upsertMemo(cid, memoText); } catch (e) { console.warn("[mission-sync] upsertMemo(v1) failed:", e); }
              }
            }
          }

          const needFallback = !Array.isArray(created) || created.length < payload.length;
          if (needFallback) {
            for (let i = 0; i < payload.length; i++) {
              const memoText = payload[i]?.__title;
              if (!memoText) continue;
              const matchPayload = {
                category: payload[i].category,
                date: payload[i].date,
                amount: payload[i].amount
              };
              const matchedId = await findLatestMatchingId(matchPayload, usedIds);
              if (matchedId != null) {
                usedIds.add(String(matchedId));
                try { await upsertMemo(matchedId, memoText); } catch (e) { console.warn("[mission-sync] fallback upsertMemo(v1) failed:", e); }
              }
            }
          }
        }
        localStorage.removeItem(LS_MISSION_EXPENSES_V1);
      }
    } catch (e) {
      console.warn("[mission-sync] expense v1 sync failed:", e);
    }
  };

  // ✅ 월 변경/초기 로딩 시: (1) 미션 로컬 → 서버 동기화 → (2) 예산/지출 조회
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await syncArtifactsFromMissionLocal();
      } catch (e) {
        console.warn("[mission-sync] failed:", e);
      }
      if (!alive) return;
      await Promise.all([fetchMonthBudgets(), fetchMonthExpenses()]);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  /* -------- ✅ 정기결제 탭으로 브로드캐스트 -------- */
  useEffect(() => {
    // 구독 목록/요약이 바뀔 때마다 이벤트 발행
    const detail = {
      ym,
      monthTotal: subscriptionsThisMonth.monthTotal,
      activeCount: subscriptionsThisMonth.activeCount,
      savableAmount: subscriptionsThisMonth.savableAmount,
      duplicates: subscriptionsThisMonth.duplicates?.map(g => ({
        key: g.key,
        count: g.count,
        total: g.total,
        latestDate: g.latestDate,
        nextBillingDate: g.nextBillingDate
      })) || [],
      list: subscriptionsThisMonth.list.map(it => ({
        id: it.id,
        date: it.date,
        amount: Number(it.amount || 0),
        memo: it.memo || "",
        nextBillingDate: addMonths(it.date, 1)
      }))
    };
    window.dispatchEvent(new CustomEvent("subscriptions:update", { detail }));
  }, [ym, subscriptionsThisMonth.monthTotal, subscriptionsThisMonth.activeCount, subscriptionsThisMonth.savableAmount, subscriptionsThisMonth.list.length, subscriptionsThisMonth.duplicates?.length]);

  /* -------- 미션쪽 실시간 이벤트 수신 -------- */
  useEffect(() => {
    const onExpenseSaved = async (e) => {
      const item = e?.detail?.item;
      if (!item || typeof item !== "object") return;

      const category = String(item.category || "기타");
      const date = String(item.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const amount = Math.floor(Number(item.amount) || 0);
      const memo = String(item.memo || "").trim();

      if (!category || !date || !(amount > 0)) return;

      try {
        const created = await saveMany([{ category, amount, date }]);
        let createdId = Array.isArray(created) ? created[0]?.id : (created?.id ?? null);

        if (createdId == null && memo) {
          const matchedId = await findLatestMatchingId({ category, date, amount });
          if (matchedId != null) createdId = matchedId;
        }

        if (createdId != null && memo) {
          await upsertMemo(createdId, memo);
          setMemoMap((prev) => ({ ...prev, [String(createdId)]: memo }));
        }

        if (date.startsWith(ym)) {
          await fetchMonthExpenses();
        }
      } catch (err) {
        console.warn("[event expenses:saved] persist failed:", err);
      }
    };

    const onBudgetSaved = async (e) => {
      const amount = Math.floor(Number(e?.detail?.amount) || 0);
      if (amount <= 0) return;
      try {
        await upsertBudget({ month: ym, category: DEFAULT_BUDGET_CATEGORY, amount });
        await fetchMonthBudgets();
      } catch (err) {
        console.warn("[event budget:saved] upsert failed:", err);
      }
    };

    window.addEventListener("expenses:saved", onExpenseSaved);
    window.addEventListener("budget:saved", onBudgetSaved);
    return () => {
      window.removeEventListener("expenses:saved", onExpenseSaved);
      window.removeEventListener("budget:saved", onBudgetSaved);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  /* -------- 외부(정기 결제 탭 등)에서 소비내역 변경 시 반영 -------- */
  useEffect(() => {
    const onChanged = async (e) => {
      const changedYm = String(e?.detail?.ym || "");
      // 같은 월만 갱신 (월 정보가 없으면 무조건 갱신)
      if (!changedYm || changedYm === ym) {
        await fetchMonthExpenses();   // 서버에서 현재 월 지출 재조회 → 상태 갱신
      }
    };
    window.addEventListener("consumptions:changed", onChanged);
    return () => window.removeEventListener("consumptions:changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  /* -------- Budget handlers -------- */
  const handleSaveBudget = async () => {
    if (budgetInput === "" || isNaN(budgetInput)) {
      alert("숫자 금액을 입력하세요.");
      return;
    }
    const amount = Number(budgetInput);
    try {
      await upsertBudget({ month: ym, category: DEFAULT_BUDGET_CATEGORY, amount });
      setIsBudgetOpen(false);
      setBudgetInput("");
      await fetchMonthBudgets();
    } catch (err) {
      console.warn("예산 저장 실패:", err);
      alert("예산 저장에 실패했어요.");
    }
  };

  /* -------- Expense handlers -------- */
  const handleOpenCreate = () => {
    setNewExpense({ id: null, category: "", date: "", amount: "", memo: "" });
    setEditingIndex(null);
    setIsExpenseOpen(true);
  };

  const handleEdit = (index) => {
    const list = asArray(expenses);
    const item = list[index];
    if (!item) return;

    const fallback = item.memo ?? item.description ?? item.note ?? item.desc ?? "";
    setNewExpense({
      id: item.id ?? null,
      category: item.category || "",
      date: item.date || "",
      amount: String(item.amount ?? ""),
      memo: memoMap[String(item.id)] ?? memoMap[item.id] ?? fallback,
    });
    setEditingIndex(index);
    setIsExpenseOpen(true);

    if (item.id != null) fetchMemoAndPatch(item.id);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseOpen(false);
    setEditingIndex(null);
    setNewExpense({ id: null, category: "", date: "", amount: "", memo: "" });
  };

  const handleSubmitExpense = async () => {
    const { id, category, date, amount, memo } = newExpense;
    if (!category || !date || !amount) {
      alert("카테고리 / 날짜 / 금액을 모두 입력하세요.");
      return;
    }
    const memoVal = (memo ?? "").trim();

    try {
      if (editingIndex !== null) {
        if (!id) {
          alert("이 항목에는 id가 없어 수정할 수 없습니다.");
          return;
        }
        await updateOne(id, { category, amount: Number(amount), date });

        if (memoVal.length > 0) {
          await upsertMemo(id, memoVal);
          setMemoMap((prev) => ({ ...prev, [String(id)]: memoVal }));
        }

        setExpenses((prev) =>
          asArray(prev).map((x) =>
            String(x.id) === String(id)
              ? { ...x, category, date, amount: Number(amount), memo: memoVal }
              : x
          )
        );
      } else {
        const created = await saveMany([{ category, amount: Number(amount), date }]);
        let createdId = Array.isArray(created) ? created[0]?.id : (created?.id ?? null);

        if (createdId == null) {
          const matchedId = await findLatestMatchingId({ category, date, amount });
          if (matchedId != null) createdId = matchedId;
        }

        if (createdId != null && memoVal.length > 0) {
          await upsertMemo(createdId, memoVal);
          setMemoMap((prev) => ({ ...prev, [String(createdId)]: memoVal }));
        }
      }
      handleCloseExpenseModal();
      await fetchMonthExpenses();
      window.dispatchEvent(new CustomEvent("consumptions:changed", { detail: { ym } }));
    } catch (err) {
      console.warn("지출 저장 실패:", err);
      alert("지출 저장에 실패했어요.");
    }
  };

  const handleDelete = async (item) => {
    const id = item?.id;
    if (!id) {
      alert("이 항목에는 id가 없어 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("정말로 삭제하시겠어요?")) return;
    try {
      await deleteOne(id);
      await fetchMonthExpenses();
      window.dispatchEvent(new CustomEvent("consumptions:changed", { detail: { ym } }));
    } catch (err) {
      console.warn("지출 삭제 실패:", err);
      alert("지출 삭제에 실패했어요.");
    }
  };

  /* -------- AI 절약 팁 (자동 생성) -------- */
  useEffect(() => {
    if (asArray(expenses).length === 0 && !monthlyBudget) {
      setAiTips([]);
      setAiError("");
      return;
    }

    let cancelled = false;
    const fetchTips = async () => {
      setAiLoading(true);
      setAiError("");
      try {
        const payload = {
          yearMonth: ym,
          totalAmount: Number(totalExpense || 0),
          budget: Number(monthlyBudget || 0),
          byCategory,
        };
        const res = await generateTips(payload, { useLLM: true });
        const tips = asArray(res?.tips).map(String).filter(Boolean).slice(0, 2);
        if (!cancelled) setAiTips(tips);
      } catch (err) {
        console.warn("AI 팁 생성 실패:", err);
        if (!cancelled) {
          setAiError("AI 팁 생성에 실패했어요.");
          setAiTips([]);
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    const t = setTimeout(fetchTips, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ym, totalExpense, monthlyBudget, byCategory.length]);

  /* -------- Render -------- */
  // ✅ 리스트 스크롤 제어용 상수
  const ROW_MIN_H = 56;
  const MAX_VISIBLE_ROWS = 4;
  const LIST_MAX_PX = ROW_MIN_H * MAX_VISIBLE_ROWS;

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={topRowStyle}>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>가계부</h1>
            <p style={{ color: "#555", fontSize: 15 }}>지출 내역을 확인하고 관리하세요.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <UploadCSV onComplete={fetchMonthExpenses} />
            <button onClick={() => setIsBudgetOpen(true)} style={btnPrimary}>예산 입력</button>
            <button onClick={handleOpenCreate} style={btnPrimary}>지출 추가</button>
          </div>
        </div>

        {/* Month Nav */}
        <div style={navRowStyle}>
          <button type="button" onClick={() => moveMonth(-1)} style={btnGhost} title="이전 달">◀</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {year}년 {monthIndex + 1}월
          </h2>
          <button type="button" onClick={() => moveMonth(1)} style={btnGhost} title="다음 달">▶</button>
          <input
            type="month"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
            style={{ marginLeft: 8, border: "1px solid #ccc", borderRadius: 8, padding: "6px 8px" }}
          />
        </div>

        {/* Budget */}
        <div style={{ textAlign: "left", fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
          {year}년 {monthIndex + 1}월 목표 예산{" "}
          <span style={{ marginLeft: 10, fontWeight: 800 }}>{monthlyBudget.toLocaleString()}원</span>
        </div>

        {/* Summary cards */}
        <div style={cardsRowStyle}>
          <SummaryCard
            title="총 지출"
            value={`${totalExpense.toLocaleString()}원`}
            sub={`총 ${asArray(expenses).length}건`}
            highlight
          />
          <SummaryCard
            title="카테고리별 분포"
            value={topCategory ? `${topCategory.name} ${topCategory.pct}%` : "-"}
            sub={`${byCategory.length}개 카테고리`}
          />
          <SummaryCard
            title="AI 절약 팁"
            value={
              aiLoading ? "생성 중..." : aiError ? aiError : (aiTips[0] || "분석할 데이터가 충분하지 않아요.")
            }
            sub={aiLoading ? "" : (aiTips[1] || "")}
          />
        </div>

        {/* Expense list — ✅ 4개 초과 시 내부 스크롤 */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>지출 내역 ({ym})</h3>

          {asArray(expenses).length === 0 ? (
            <p style={{ color: "#999" }}>등록된 지출이 없습니다.</p>
          ) : (
            <div
              style={{
                maxHeight: `${LIST_MAX_PX}px`,
                overflowY: asArray(expenses).length > MAX_VISIBLE_ROWS ? "auto" : "visible",
                paddingRight: 6,
              }}
            >
              {asArray(expenses).map((e, i) => {
                const memoText =
                  memoMap[String(e.id)] ??
                  memoMap[e.id] ??
                  e.memo ?? e.description ?? e.note ?? e.desc ?? "";
                return (
                  <div key={e.id ?? i} style={{ ...rowItemStyle, minHeight: ROW_MIN_H }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>{e.category || "기타"}</p>
                      <p style={{ fontSize: 13, color: "#555" }}>
                        {e.date}{memoText ? `  -  ${memoText}` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <p style={{ fontWeight: 700 }}>{Number(e.amount).toLocaleString()}원</p>
                      <button onClick={() => handleEdit(i)} style={iconBtn} aria-label="수정" title="수정">✏️</button>
                      <button onClick={() => handleDelete(e)} style={iconBtn} aria-label="삭제" title="삭제">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div style={panelStyle}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
            {year}년 {monthIndex + 1}월
          </h3>
          <div style={calendarGridStyle}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} style={{ fontWeight: 700 }}>{d}</div>
            ))}
            {calendarDays.map((day, idx) =>
              day ? (
                <div
                  key={idx}
                  style={{
                    minHeight: 60,
                    borderRadius: 8,
                    padding: 4,
                    backgroundColor: dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`]
                      ? "#fff7cc"
                      : "transparent"
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{day}</div>
                  {dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`] ? (
                    <div style={{ color: "#E85A00", fontSize: 12 }}>
                      - {dailyTotals[`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`].toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div key={idx}></div>
              )
            )}
          </div>
        </div>

        {/* Budget Modal */}
        {isBudgetOpen ? (
          <Modal onClose={() => setIsBudgetOpen(false)}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {ym} 월 예산 설정
            </h3>
            <input
              type="number"
              placeholder="예산 입력 (원)"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveBudget(); }}
              style={inputStyle}
            />
            <div>
              <button onClick={handleSaveBudget} style={btnPrimary}>저장</button>
              <button onClick={() => setIsBudgetOpen(false)} style={btnText}>닫기</button>
            </div>
            {asArray(budgetsList).length > 0 && (
              <div style={{ marginTop: 16, textAlign: "left" }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>설정된 예산</p>
                {asArray(budgetsList).map((b) => (
                  <div key={b.id ?? `${b.category}-${b.amount}`} style={{ fontSize: 14, color: "#444" }}>
                    • {b.category}: {Number(b.amount).toLocaleString()}원
                  </div>
                ))}
              </div>
            )}
          </Modal>
        ) : null}

        {/* Expense Modal (생성/수정 공용) */}
        {isExpenseOpen ? (
          <Modal onClose={handleCloseExpenseModal}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {editingIndex !== null ? "지출 수정" : "지출 추가"}
            </h3>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              style={inputStyle}
            >
              <option value="">카테고리 선택</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="금액 입력 (원)"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="지출 설명 (선택)"
              value={newExpense.memo}
              onChange={(e) => setNewExpense({ ...newExpense, memo: e.target.value })}
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={handleSubmitExpense} style={btnPrimary}>
                {editingIndex !== null ? "수정" : "추가"}
              </button>
              <button onClick={handleCloseExpenseModal} style={btnText}>닫기</button>
            </div>
          </Modal>
        ) : null}
      </div>
    </section>
  );
}

/* ------- Presentational helpers ------- */
const sectionStyle = {
  width: "100%",
  minHeight: "100vh",
  backgroundColor: "#fff",
  padding: "50px 0",
  display: "flex",
  justifyContent: "center",
  overflowY: "auto"
};
const containerStyle = {
  width: "100%",
  maxWidth: "950px",
  padding: "0 80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch"
};
const topRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
};
const navRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16
};
const cardsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 40
};
const panelStyle = {
  border: "1.5px solid #000",
  borderRadius: 10,
  padding: "20px 30px",
  marginBottom: 30
};
const rowItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #eee",
  padding: "10px 0"
};
const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  textAlign: "center",
  gap: 8,
  fontSize: 14
};
const btnPrimary = {
  backgroundColor: "#FFD858",
  border: "1.5px solid #000",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 700,
  cursor: "pointer"
};
const btnGhost = {
  background: "transparent",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer"
};
const btnText = {
  background: "transparent",
  border: "none",
  marginLeft: 10,
  cursor: "pointer"
};
const iconBtn = { background: "transparent", border: "none", cursor: "pointer" };
const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginBottom: 10
};

function SummaryCard({ title, value, sub, highlight }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1.5px solid #000",
        borderRadius: 10,
        padding: "20px 30px",
        background: "#fff",
        transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
        willChange: "transform, box-shadow, border-color",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#FFD858";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#000";
      }}
    >
      <p style={{ fontWeight: 700 }}>{title}</p>
      <p
        style={{
          color: highlight ? "#FF9900" : "#000",
          fontWeight: 700,
          fontSize: 18,
          marginBottom: 4,
          minHeight: 22,
        }}
      >
        {value}
      </p>
      {sub ? <p style={{ color: "#888", fontSize: 13 }}>{sub}</p> : null}
    </div>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          padding: "40px 60px",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
          minWidth: 420,
          maxWidth: 560,
          width: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto"
        }}
      >
        {children}
      </div>
    </div>
  );
}
