import { useEffect, useMemo, useRef, useState } from "react";
import { loadRange, saveMany, deleteOne, updateOne } from "../api/consumption";
import { upsertMemo, loadMemo } from "../api/memo";

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

/** 안전 배열화 */
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

/** YYYY-MM 헬퍼 */
const dateToYm = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthRange = (ym) => {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  const yyyy = String(y);
  const mm = String(m).padStart(2, "0");
  const lastDay = String(new Date(y, m, 0).getDate()).padStart(2, "0");
  const start = `${yyyy}-${mm}-01`;
  const end = `${yyyy}-${mm}-${lastDay}`;
  return { start, end };
};

/** 메모에서 서비스 키 추출 (첫 토큰) — 이름 보정(표시용)에서만 사용 */
const serviceKey = (memo) => {
  const t = String(memo ?? "").trim().toLowerCase();
  if (!t) return "";
  // 공백, en-dash, 콜론, 언더스코어, 파이프, 콤마, 가운데점, 슬래시, 하이픈
  const first = t.split(/[\s\u2013_:|,\u00B7/-]+/)[0] || t;
  return first;
};

/** 다양한 응답 모양에서 "메모 문자열"만 추출 (가계부와 동일 컨벤션) */
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

/** 서버 응답 정규화 (AccountBookPage와 동일 키) */
const normalizeConsumption = (x = {}) => {
  const id = x.id ?? x.consumptionId ?? x.seq ?? x.pk ?? x._id ?? null;
  const category =
    (typeof x.category === "string" ? x.category : null) ??
    x.categoryName ?? x.cat ?? x.type ?? x.consumptionCategory ??
    (typeof x.category === "object"
      ? (x.category?.name ?? x.category?.label ?? x.category?.title)
      : null) ?? "";
  const dateRaw =
    x.date ?? x.useDate ?? x.spentDate ?? x.paymentDate ??
    x.createdDate ?? x.created_at ?? x.createdAt ?? "";
  const date = typeof dateRaw === "string" ? dateRaw.slice(0, 10) : "";
  const amountRaw = x.amount ?? x.price ?? x.money ?? x.cost ?? x.value ?? 0;
  const amount = Number(amountRaw ?? 0);
  const memo = x.memo ?? x.description ?? x.note ?? x.desc ?? "";
  return { id, category, date, amount, memo };
};

/** 방금 저장된 항목의 id를 (category,date,amount)로 재조회해서 찾기 */
const findLatestMatchingId = async ({ ym, category, date, amount }) => {
  try {
    const { start, end } = monthRange(ym);
    const fresh = await loadRange(start, end, { page: 0, size: 1000 });
    const list = asArray(fresh).map(normalizeConsumption)
      .filter(x =>
        x.category === String(category) &&
        x.date === String(date).slice(0, 10) &&
        Number(x.amount) === Number(amount)
      )
      .sort((a, b) => (Number(b.id || 0) - Number(a.id || 0)));
    return list[0]?.id ?? null;
  } catch {
    return null;
  }
};

/* ============================================================
   🔎 서비스 정규화 / 별칭 / 유형(패밀리) 매핑
============================================================ */
/** 서비스명 정규화 */
const normalizeServiceText = (raw = "") =>
  String(raw).toLowerCase().replace(/\s+/g, "").replace(/[+().-]/g, "");

/** 별칭 → 정규 키 매핑 (서비스 단위) */
const SERVICE_ALIASES = {
  /* ---- OTT ---- */
  netflix: "netflix", 넷플릭스: "netflix",
  disneyplus: "disneyplus", "디즈니플러스": "disneyplus", "디즈니": "disneyplus",
  tving: "tving", 티빙: "tving",
  wavve: "wavve", 웨이브: "wavve",
  watcha: "watcha", 왓챠: "watcha",
  primevideo: "primevideo", "아마존프라임비디오": "primevideo", "프라임비디오": "primevideo",
  appletv: "appletv", appletvplus: "appletv", "애플tv": "appletv",
  hulu: "hulu",
  max: "max", hbomax: "max", hbo: "max",
  paramountplus: "paramountplus", "파라마운트플러스": "paramountplus",
  peacock: "peacock",
  coupangplay: "coupangplay", "쿠팡플레이": "coupangplay",

  /* ---- 음악 ---- */
  spotify: "spotify", 스포티파이: "spotify",
  applemusic: "applemusic", "애플뮤직": "applemusic",
  melon: "melon", 멜론: "melon",
  genie: "genie", 지니: "genie",
  bugs: "bugs", 벅스: "bugs",
  flo: "flo", 플로: "flo",
  youtubemusic: "youtubemusic", "유튜브뮤직": "youtubemusic",
  amazonmusic: "amazonmusic",
  tidal: "tidal",
  deezer: "deezer",
  pandora: "pandora",

  /* ---- 생산성/클라우드 ---- */
  notion: "notion", 노션: "notion",
  evernote: "evernote",
  "microsoft365": "microsoft365", "office365": "microsoft365", "ms365": "microsoft365",
  adobe: "adobe", "adobecc": "adobe", "adobecreativecloud": "adobe",
  dropbox: "dropbox",
  onedrive: "onedrive", "microsoftonedrive": "onedrive",
  googleone: "googleone", "googlestorage": "googleone",
  box: "box",
  slack: "slack",
  zoom: "zoom",
  todoist: "todoist",
  trello: "trello",
  asana: "asana",
  figma: "figma",
  canva: "canva",
  "googleworkspace": "googleworkspace", "gsuite": "googleworkspace",

  /* ---- 게임 ---- */
  xboxgamepass: "xboxgamepass", gamepass: "xboxgamepass",
  playstationplus: "playstationplus", psplus: "playstationplus",
  nintendoswitchonline: "nintendoswitchonline", nso: "nintendoswitchonline",

  /* ---- VPN ---- */
  nordvpn: "nordvpn",
  expressvpn: "expressvpn",
  surfshark: "surfshark",
  protonvpn: "protonvpn",

  /* ---- 피트니스 ---- */
  strava: "strava",
  fitbitpremium: "fitbitpremium",
  peloton: "peloton",

  /* ---- 멤버십/커머스 ---- */
  "naverplus": "naverplus", "네이버플러스": "naverplus",
  "coupangwow": "coupangwow", "쿠팡와우": "coupangwow", "wow멤버십": "coupangwow",
  "baemin": "baemin", "배민": "baemin", "배민멤버십": "baemin",
  "yogiyo": "yogiyo", "요기요": "yogiyo", "요기요플러스": "yogiyo",
  "youtube": "youtube", "유튜브프리미엄": "youtube",

  /* ---- 뉴스/컨텐츠 ---- */
  nytimes: "nytimes",
  washingtonpost: "washingtonpost",
  wsj: "wsj", "wallstreetjournal": "wsj",
  ft: "ft", "financialtimes": "ft",
  economist: "economist",
};

/** 정규 서비스 키 추출: memo/name을 받아서 별칭 매핑 */
const detectServiceKey = (nameOrMemo = "") => {
  const t = normalizeServiceText(nameOrMemo);
  if (!t) return "";
  if (SERVICE_ALIASES[t]) return SERVICE_ALIASES[t];
  // 부분 포함 매칭 (예: "spotifyfamily" → spotify)
  for (const k of Object.keys(SERVICE_ALIASES)) {
    if (t.includes(normalizeServiceText(k))) return SERVICE_ALIASES[k];
  }
  // 그래도 못 찾으면 첫 토큰 키라도 사용
  const tok = (String(nameOrMemo || "").trim().toLowerCase().split(/[\s\u2013_:|,\u00B7/-]+/)[0]) || "";
  const tokN = normalizeServiceText(tok);
  return SERVICE_ALIASES[tokN] || tokN;
};

/** 서비스 키 → 패밀리(유형) */
const SERVICE_FAMILY = {
  // OTT
  netflix: "OTT", disneyplus: "OTT", tving: "OTT", wavve: "OTT", watcha: "OTT",
  primevideo: "OTT", appletv: "OTT", hulu: "OTT", max: "OTT", paramountplus: "OTT",
  peacock: "OTT", coupangplay: "OTT", youtube: "OTT",

  // 음악
  spotify: "음악", applemusic: "음악", melon: "음악", genie: "음악", bugs: "음악", flo: "음악",
  youtubemusic: "음악", amazonmusic: "음악", tidal: "음악", deezer: "음악", pandora: "음악",

  // 생산성/클라우드
  notion: "생산성", evernote: "생산성", microsoft365: "생산성", adobe: "생산성", slack: "생산성",
  zoom: "생산성", todoist: "생산성", trello: "생산성", asana: "생산성", figma: "생산성", canva: "생산성",
  googleworkspace: "생산성",
  dropbox: "클라우드", onedrive: "클라우드", googleone: "클라우드", box: "클라우드",

  // VPN
  nordvpn: "VPN", expressvpn: "VPN", surfshark: "VPN", protonvpn: "VPN",

  // 게임
  xboxgamepass: "게임", playstationplus: "게임", nintendoswitchonline: "게임",

  // 멤버십/커머스
  naverplus: "멤버십", coupangwow: "멤버십", baemin: "멤버십", yogiyo: "멤버십",

  // 뉴스/컨텐츠
  nytimes: "뉴스", washingtonpost: "뉴스", wsj: "뉴스", ft: "뉴스", economist: "뉴스",
};
const getServiceFamily = (serviceKey = "") => SERVICE_FAMILY[serviceKey] || "";

/** 해지/관리 URL 추정 — 키 확장 */
const getCancelUrl = (sub) => {
  // 인앱 결제 폴백
  if (sub?.channel === "googleplay") return "https://play.google.com/store/account/subscriptions";
  if (sub?.channel === "appstore")  return "https://support.apple.com/en-us/118428";

  // 1) 서비스 규격 키 추출 (한글/영문/변형 모두 alias로 통일)
  const key = detectServiceKey(sub?.name || sub?.memo || "");
  const n = normalizeServiceText(sub?.name || "");

  // 2) 서비스별 해지/관리 URL 맵 (규격 키 기준)
  const MAP = {
    /* 음악 */
    melon: "https://faqs2.melon.com/customer/faq/informFaq.htm?faqId=2212",
    spotify: "https://www.spotify.com/account/subscription",
    applemusic: "https://support.apple.com/en-us/HT204939",
    genie: "https://help.genie.co.kr/customer/faq",
    bugs: "https://help.bugs.co.kr/",
    flo: "https://www.music-flo.com/member/mypage",
    youtubemusic: "https://www.youtube.com/paid_memberships",
    amazonmusic: "https://www.amazon.com/hz5/yourmembershipsandsubscriptions",
    tidal: "https://support.tidal.com/hc/en-us/articles/202757471-Canceling-TIDAL",
    deezer: "https://support.deezer.com/hc/en-us/articles/115004658565-How-to-cancel-your-subscription",
    pandora: "https://help.pandora.com/s/article/Cancel-Pandora-Subscription",

    /* 글로벌 OTT */
    netflix: "https://www.netflix.com/cancelplan",
    disneyplus: "https://www.disneyplus.com/account/cancel-subscription",
    appletv: "https://support.apple.com/en-us/118398",
    primevideo: "https://www.primevideo.com/help?nodeId=GWGDSNXVPJ93UW5V",
    hulu: "https://help.hulu.com/s/article/cancel",
    max: "https://help.max.com/us-en/answer/000001359",
    paramountplus: "https://support.paramountplus.com/s/article/PD-How-can-I-cancel",
    peacock: "https://www.peacocktv.com/help/article/cancel",

    /* 국내 OTT */
    tving: "https://www.tving.com/",
    wavve: "https://www.wavve.com/",
    watcha: "https://help.watcha.co.kr/hc/ko/categories/4403928691353-%EA%B5%AC%EB%8F%85%EA%B6%8C-%ED%95%B4%EC%A7%80",
    coupangplay: "https://www.coupang.com/",

    /* 생산성/클라우드 */
    notion: "https://www.notion.so/settings/billing",
    evernote: "https://help.evernote.com/hc/articles/208314748",
    microsoft365: "https://account.microsoft.com/services",
    adobe: "https://account.adobe.com/plans",
    dropbox: "https://www.dropbox.com/account/plan",
    onedrive: "https://account.microsoft.com/services/onedrive",
    googleone: "https://one.google.com/u/0/storage",
    box: "https://account.box.com/settings/billing",
    slack: "https://my.slack.com/admin/billing",
    zoom: "https://explore.zoom.us/en/billing/",
    todoist: "https://todoist.com/help/articles/cancel-a-todoist-subscription",
    trello: "https://trello.com/my/billing",
    asana: "https://asana.com/guide/help/premium/billing#gl-cancel",
    figma: "https://www.figma.com/account/billing",
    canva: "https://www.canva.com/help/article/cancel-your-canva-subscription",
    googleworkspace: "https://admin.google.com/ac/billing",

    /* VPN */
    nordvpn: "https://my.nordaccount.com/billing/subscriptions",
    expressvpn: "https://www.expressvpn.com/support/troubleshooting/cancel-manage-subscription/",
    surfshark: "https://my.surfshark.com/",
    protonvpn: "https://account.protonvpn.com/dashboard",

    /* 게임 */
    xboxgamepass: "https://account.microsoft.com/services",
    playstationplus: "https://www.playstation.com/en-us/support/subscriptions/cancel-playstation-subscription/",
    nintendoswitchonline: "https://www.nintendo.com/switch/online-service/auto-renewal/",

    /* 멤버십/커머스 */
    naverplus: "https://nid.naver.com/membership/my",
    coupangwow: "https://www.coupang.com/np/mycoupang/benefit",
    baemin: "https://www.baemin.com/",
    yogiyo: "https://www.yogiyo.co.kr/mobile/#/mypage",

    /* 뉴스 */
    nytimes: "https://www.nytimes.com/subscription/cancel",
    washingtonpost: "https://subscribe.washingtonpost.com/manage-subscription",
    wsj: "https://customercenter.wsj.com",
    ft: "https://help.ft.com/contact/#cancel",
    economist: "https://myaccount.economist.com/s/subscriptions",

    /* 기타 */
    youtube: "https://www.youtube.com/paid_memberships",
  };

  // 3) 규격 키로 1차 매칭
  if (key && MAP[key]) return MAP[key];

  // 4) 안전망: 이름 문자열에 포함되는 키가 있으면 사용
  const alt = Object.keys(MAP).find((kk) => n.includes(kk));
  return alt ? MAP[alt] : null;
};

const MEMO_PREFETCH_LIMIT = 200; // 무리없는 선에서 선로딩

const SubscriptionPage = () => {
  // 뷰의 월
  const [ym, setYm] = useState(() => dateToYm(new Date()));

  // 구독 카드 데이터 (실데이터)
  // shape: { id, name, price, nextPayment, category:'구독', memo? }
  const [subscriptions, setSubscriptions] = useState([]);

  // 요약값
  const totalPayment = useMemo(
    () => subscriptions.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [subscriptions]
  );

  /* ============================================================
     ✅ 중복 로직: 서비스 중복 + 유형 중복, 합산 절감액
  ============================================================ */
  const {
    serviceDuplicates,
    familyDuplicates,
    serviceSavable,
    familySavable,
    savableAmount,
  } = useMemo(() => {
    // 각 항목에 serviceKey, family 주입
    const enriched = subscriptions.map((it) => {
      const rawName = (it.memo && it.memo.trim()) ? it.memo : it.name;
      const sKey = detectServiceKey(rawName);
      const fam = getServiceFamily(sKey);
      return { ...it, __serviceKey: sKey, __family: fam };
    });

    // 1) 서비스 단위 그룹핑
    const byService = new Map();
    for (const it of enriched) {
      const k = it.__serviceKey || `id-${it.id ?? Math.random()}`;
      const cur = byService.get(k) || [];
      cur.push(it);
      byService.set(k, cur);
    }

    const sDups = [];
    let serviceSavableLocal = 0;

    // 서비스별 유지비(=최고가 1개) 집계 → 이후 가족(유형) 절감 산출에 사용
    const serviceStats = []; // { key, family, keepCost, totalCost, displayName }

    for (const [k, arr] of byService.entries()) {
      const amounts = arr.map((x) => Number(x.price || 0));
      const keep = Math.max(...amounts);
      const total = amounts.reduce((s, v) => s + v, 0);
      const family = arr[0]?.__family || "";
      const displayName = arr[0]?.name || k;

      if (arr.length >= 2) {
        sDups.push({ key: k, count: arr.length, total, items: arr });
        serviceSavableLocal += Math.max(0, total - keep);
      }
      serviceStats.push({ key: k, family, keepCost: keep, totalCost: total, displayName });
    }

    // 2) 유형 단위(서비스 dedupe 이후) 그룹핑
    const byFamily = new Map();
    for (const s of serviceStats) {
      if (!s.family) continue;
      const cur = byFamily.get(s.family) || [];
      cur.push(s);
      byFamily.set(s.family, cur);
    }

    const fDups = [];
    let familySavableLocal = 0;
    for (const [fam, stats] of byFamily.entries()) {
      if (stats.length >= 2) {
        const costs = stats.map((s) => Number(s.keepCost || 0));
        const keep = Math.max(...costs);
        const total = costs.reduce((acc, v) => acc + v, 0);
        familySavableLocal += Math.max(0, total - keep);

        fDups.push({
          family: fam,
          count: stats.length,
          sample: stats.slice(0, 4).map((s) => s.displayName),
          items: stats,
        });
      }
    }

    const totalSavable = serviceSavableLocal + familySavableLocal;
    return {
      serviceDuplicates: sDups,
      familyDuplicates: fDups,
      serviceSavable: serviceSavableLocal,
      familySavable: familySavableLocal,
      savableAmount: totalSavable,
    };
  }, [subscriptions]);

  /** 메모를 불러와 카드 이름 보정 */
  const fillNamesFromMemo = async (cards) => {
    const ids = cards.map((c) => c.id).filter((id) => id != null).slice(0, MEMO_PREFETCH_LIMIT);
    if (!ids.length) return cards;

    const results = await Promise.allSettled(ids.map((id) => loadMemo(id)));
    const memoById = {};
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") memoById[String(ids[idx])] = safeExtractMemo(r.value);
    });

    return cards.map((c) => {
      const mem = (memoById[String(c.id)] ?? c.memo ?? "").trim();
      const guessed = serviceKey(mem);
      return { ...c, name: guessed || c.name, memo: mem || c.memo };
    });
  };

  // ====== 경로 1: AccountBook → 브로드캐스트 구독 ======
  const gotEventRef = useRef(false);
  useEffect(() => {
    const onSubs = async (e) => {
      gotEventRef.current = true;
      const { ym: nextYm, list } = e.detail || {};
      if (nextYm) setYm(nextYm);

      // list: [{ id, date, amount, memo, nextBillingDate }]
      const roughCards = asArray(list).map((it) => ({
        id: it.id,
        // 들어온 memo로 추정, 없으면 임시 '구독' — 이후 fillNamesFromMemo에서 보정
        name: serviceKey(it.memo) || "구독",
        price: Number(it.amount || 0),
        nextPayment: it.nextBillingDate || addMonths(it.date, 1),
        category: "구독",
        memo: it.memo || "",
      }));

      const cards = await fillNamesFromMemo(roughCards);
      setSubscriptions(cards);
    };
    window.addEventListener("subscriptions:update", onSubs);
    return () => window.removeEventListener("subscriptions:update", onSubs);
  }, []);

  // ====== 경로 2: 단독 진입 시 직접 조회 (구독만 필터) ======
  const fetchSelf = async (targetYm = ym) => {
    try {
      const { start, end } = monthRange(targetYm);
      const res = await loadRange(start, end, { page: 0, size: 1000 });
      const arr = asArray(res);

      // 서버 응답 정규화
      const norm = arr.map((x) => {
        const id = x.id ?? x.consumptionId ?? x.seq ?? x.pk ?? x._id ?? null;
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

        return { id, category, date, amount, memo };
      });

      // ‘구독’만 필터
      const subs = norm.filter((e) => String(e.category || "").trim() === "구독");

      // 1차 카드(이름은 임시) → 2차로 메모 조회해 서비스명 보정
      const roughCards = subs.map((it) => ({
        id: it.id,
        name: serviceKey(it.memo) || "구독",        // 임시
        price: Number(it.amount || 0),
        nextPayment: addMonths(it.date, 1),
        category: "구독",
        memo: it.memo || "",
      }));

      const cards = await fillNamesFromMemo(roughCards);
      setSubscriptions(cards);
    } catch (err) {
      console.warn("[SubscriptionPage] loadRange failed:", err);
      setSubscriptions([]);
    }
  };

  // 최초 진입 시 즉시 로드
  useEffect(() => {
    fetchSelf(ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  // ====== CRUD (추가/수정/삭제) ======
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [newSub, setNewSub] = useState({
    name: "",
    price: "",
    nextPayment: "",
    category: "구독",
  });

  const [editSub, setEditSub] = useState({ id: null, name: "", price: "", nextPayment: "" });

  const handleAddSubscription = async () => {
    const { name, price, nextPayment } = newSub;
    if (!name || !price || !nextPayment) {
      alert("서비스명 / 금액 / 다음 결제일을 모두 입력하세요.");
      return;
    }

    const cleanName = String(name).trim();
    const amount = Math.floor(Number(price));
    const date = String(nextPayment).slice(0, 10);
    const targetYm = dateToYm(new Date(date));

    // 1) 낙관적 UI 반영
    const tempId = `tmp-${Date.now()}`;
    setSubscriptions((prev) => [
      ...prev,
      { id: tempId, name: cleanName, price: amount, nextPayment: date, category: "구독", memo: cleanName }
    ]);

    try {
      // 2) 실제 저장
      const created = await saveMany([{ category: "구독", amount, date }]);
      let createdId = Array.isArray(created) ? (created[0]?.id ?? null) : (created?.id ?? null);

      // 3) 매칭 보강
      if (createdId == null) {
        createdId = await findLatestMatchingId({ ym: targetYm, category: "구독", date, amount });
      }

      // 4) 메모에 서비스명 저장 (이름 추정/그룹핑에 필요)
      if (createdId != null && cleanName) {
        try { await upsertMemo(createdId, cleanName); }
        catch (e) { console.warn("[SubscriptionPage] upsertMemo failed:", e); }
      }

      // 5) 임시 카드 → 실제 id로 치환
      setSubscriptions((prev) =>
        prev.map((x) => (x.id === tempId ? { ...x, id: createdId ?? tempId } : x))
      );

      // 6) 월 이동/동기화
      if (targetYm !== ym) setYm(targetYm);
      await fetchSelf(targetYm);

      // 7) 가계부 탭 갱신 신호
      window.dispatchEvent(new CustomEvent("consumptions:changed", { detail: { ym: targetYm } }));

      // 8) 폼 리셋
      setNewSub({ name: "", price: "", nextPayment: "", category: "구독" });
      setIsAddOpen(false);
    } catch (err) {
      // 실패 시 임시 카드 롤백
      setSubscriptions((prev) => prev.filter((x) => x.id !== tempId));
      console.warn("[SubscriptionPage] saveMany failed:", err);
      alert("구독 저장에 실패했어요.");
    }
  };

  const openEdit = (s) => {
    setEditSub({
      id: s.id,
      name: s.name || "",
      price: String(s.price ?? ""),
      nextPayment: s.nextPayment || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateSubscription = async () => {
    const { id, name, price, nextPayment } = editSub;
    if (!id) return alert("수정할 항목의 id가 없습니다.");
    if (!name || !price || !nextPayment) return alert("서비스명 / 금액 / 다음 결제일을 모두 입력하세요.");

    // nextPayment = (저장된 date + 1개월) 이므로, 저장 시엔 -1개월로 되돌림
    const saveDate = addMonths(String(nextPayment).slice(0, 10), -1);

    try {
      await updateOne(id, { category: "구독", amount: Math.floor(Number(price)), date: saveDate });
      if (name.trim()) {
        try { await upsertMemo(id, name.trim()); } catch (e) { console.warn("[SubscriptionPage] upsertMemo failed:", e); }
      }

      // 로컬 즉시 반영
      setSubscriptions((prev) =>
        prev.map((x) =>
          String(x.id) === String(id)
            ? { ...x, name, price: Number(price), nextPayment }
            : x
        )
      );

      // 재조회(서버 값 확정) + 가계부 갱신 브로드캐스트
      await fetchSelf(ym);
      window.dispatchEvent(new CustomEvent("consumptions:changed", { detail: { ym } }));

      setIsEditOpen(false);
    } catch (err) {
      console.warn("[SubscriptionPage] updateOne failed:", err);
      alert("수정에 실패했어요.");
    }
  };

  const handleDelete = async (sub) => {
    if (!sub?.id) return alert("삭제할 항목의 id가 없습니다.");
    if (!confirm("정말로 삭제하시겠어요?")) return;
    try {
      await deleteOne(sub.id);
      setSubscriptions((prev) => prev.filter((x) => String(x.id) !== String(sub.id)));

      // 가계부 갱신 신호
      window.dispatchEvent(new CustomEvent("consumptions:changed", { detail: { ym } }));
    } catch (err) {
      console.warn("[SubscriptionPage] deleteOne failed:", err);
      alert("삭제에 실패했어요.");
    }
  };

  const handleCancel = (sub) => {
    const url = sub.cancelUrl || getCancelUrl(sub);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const q = encodeURIComponent(`${sub.name} 구독 해지`);
      window.open(`https://www.google.com/search?q=${q}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "40px clamp(16px, 5vw, 60px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* === 제목 === */}
        <div style={{ marginBottom: "30px", textAlign: "left" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
            정기 결제
          </h1>
          <p style={{ color: "#555", fontSize: "15px" }}>
            구독 서비스를 관리하고 비용을 절감하세요.
          </p>
        </div>

        {/* === 상단 요약 카드 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "30px",
          }}
        >
          <SummaryCard
            title="월 총 결제액"
            value={totalPayment.toLocaleString() + "원"}
            sub={`총 ${subscriptions.length}건의 거래`}
            highlight
          />
          <SummaryCard
            title="활성 구독"
            value={`${subscriptions.length}개`}
            sub="현재 이용 중"
          />
          <SummaryCard
            title="절감 가능액"
            value={savableAmount > 0 ? `${savableAmount.toLocaleString()}원` : "0원"}
            sub={`서비스 중복 ${serviceSavable.toLocaleString()}원 + 유형 중복 ${familySavable.toLocaleString()}원`}
            highlight
          />
        </div>

        {/* === 중복 구독 경고: 동일 서비스 === */}
        {serviceDuplicates.length > 0 && (
          <div style={alertBoxStyle}>
            <h3 style={alertTitle}>중복 구독 발견 (동일 서비스)</h3>
            <p style={alertText}>
              {serviceDuplicates.map((g, i) => (
                <span key={g.key}>
                  <b>{g.key}</b> {g.count}건{ i < serviceDuplicates.length - 1 ? ", " : "" }
                </span>
              ))}{" "}
              — 중복 항목 해지 시 매달 약 <b>{savableAmount.toLocaleString()}원</b> 절감 가능해요.
            </p>
          </div>
        )}

        {/* === 유형(OTT/음악 등) 중복 경고 === */}
        {familyDuplicates.length > 0 && (
          <div style={alertBoxStyle}>
            <h3 style={alertTitle}>유형 중복 구독</h3>
            <p style={alertText}>
              {familyDuplicates.map((g, i) => (
                <span key={g.family}>
                  <b>{g.family}</b> {g.count}개 서비스
                  {g.sample?.length ? ` (예: ${g.sample.join(", ")})` : ""}
                  { i < familyDuplicates.length - 1 ? ", " : "" }
                </span>
              ))}
              {" "}— 같은 유형의 구독이 여러 개예요. 1개만 유지해도 비용을 줄일 수 있어요.
            </p>
          </div>
        )}

        {/* === 구독 목록 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "40px 0 16px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 800 }}>구독 목록</h3>
          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              backgroundColor: "#FFD858",
              border: "1px solid #000",
              borderRadius: "20px",
              padding: "8px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + 구독 추가
          </button>
        </div>

        {/* === 구독 카드 === */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "40px",
          }}
        >
          {subscriptions.length === 0 ? (
            <div style={{ color: "#777", fontSize: 14 }}>표시할 구독이 없습니다.</div>
          ) : (
            subscriptions.map((s, i) => (
              <SubscriptionCard
                key={s.id ?? i}
                data={s}
                onCancel={() => handleCancel(s)}
                onDelete={() => handleDelete(s)}
                onEdit={() => openEdit(s)}
              />
            ))
          )}
        </div>
      </div>

      {/* === 추가 모달 === */}
      {isAddOpen && (
        <Modal onClose={() => setIsAddOpen(false)}>
          <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>
            구독 추가
          </h3>

          <input
            type="text"
            placeholder="서비스 이름"
            value={newSub.name}
            onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="월 요금 (원)"
            value={newSub.price}
            onChange={(e) => setNewSub({ ...newSub, price: e.target.value })}
            style={inputStyle}
          />
          <input
            type="date"
            value={newSub.nextPayment}
            onChange={(e) =>
              setNewSub({ ...newSub, nextPayment: e.target.value })
            }
            style={inputStyle}
          />
          {/* 기존 구조 유지: 셀렉트는 보이되 값은 ‘구독’ 고정 */}
          <select
            value={newSub.category}
            onChange={() => setNewSub((prev) => ({ ...prev, category: "구독" }))}
            style={inputStyle}
          >
            <option value="구독">구독</option>
            <option value="기타" disabled>기타 (사용 안함)</option>
          </select>

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={handleAddSubscription}
              style={{
                backgroundColor: "#FFD858",
                border: "1px solid #000",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              추가
            </button>
            <button
              onClick={() => setIsAddOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              닫기
            </button>
          </div>
        </Modal>
      )}

      {/* === 수정 모달 === */}
      {isEditOpen && (
        <Modal onClose={() => setIsEditOpen(false)}>
          <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>
            구독 수정
          </h3>

          <input
            type="text"
            placeholder="서비스 이름"
            value={editSub.name}
            onChange={(e) => setEditSub({ ...editSub, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="월 요금 (원)"
            value={editSub.price}
            onChange={(e) => setEditSub({ ...editSub, price: e.target.value })}
            style={inputStyle}
          />
          <input
            type="date"
            value={editSub.nextPayment}
            onChange={(e) => setEditSub({ ...editSub, nextPayment: e.target.value })}
            style={inputStyle}
          />

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={handleUpdateSubscription}
              style={{
                backgroundColor: "#FFD858",
                border: "1px solid #000",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              저장
            </button>
            <button
              onClick={() => setIsEditOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              취소
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
};

/* 🔸 SummaryCard — hover 강조 버전 */
const SummaryCard = ({ title, value, sub, highlight }) => (
  <div
    style={{
      flex: 1,
      border: "1px solid #ccc",
      borderRadius: "12px",
      padding: "28px 32px",
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
      e.currentTarget.style.borderColor = "#ccc";
    }}
  >
    <p style={{ fontWeight: 700, marginBottom: "6px" }}>{title}</p>
    <p
      style={{
        color: highlight ? "#FF9900" : "#000",
        fontWeight: 700,
        fontSize: "18px",
        marginBottom: "4px",
      }}
    >
      {value}
    </p>
    {sub ? <p style={{ color: "#888", fontSize: "13px" }}>{sub}</p> : null}
  </div>
);

/* 🔸 SubscriptionCard — hover 강조 (테두리 고정) */
const SubscriptionCard = ({ data, onCancel, onDelete, onEdit }) => (
  <div
    style={{
      border: "1px solid #aaa",
      borderRadius: "14px",
      padding: "24px 28px",
      backgroundColor: "#fff",
      transition: "transform .2s ease, box-shadow .2s ease",
      willChange: "transform, box-shadow",
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}
    >
      {/* ✅ 타이틀은 서비스명 */}
      <h4 style={{ fontWeight: 700, fontSize: "16px" }}>{data.name}</h4>
      {/* ✅ 노란 배지는 항상 '구독' */}
      <span
        style={{
          fontSize: "12px",
          backgroundColor: "#FFD858",
          padding: "4px 8px",
          borderRadius: "8px",
          border: "1px solid #000",
          fontWeight: 600,
        }}
      >
        구독
      </span>
    </div>

    <p style={{ color: "#555", fontSize: "13px", marginBottom: "6px" }}>
      다음 결제일: <b style={{ color: "#000" }}>{data.nextPayment}</b>
    </p>
    <p style={{ fontWeight: 700, color: "#E85A00", fontSize: "15px" }}>
      {Number(data.price).toLocaleString()}원 / 월
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "6px",
        marginTop: "14px",
      }}
    >
      <button
        style={{
          background: "#f8f8f8",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "6px",
          cursor: "pointer",
        }}
        onClick={onEdit} // ✅ 수정 모달 오픈
      >
        수정
      </button>

      <button
        onClick={onCancel}
        aria-label={`${data.name} 해지 페이지로 이동`}
        style={{
          background: "#fff",
          border: "1px solid #E6A100",
          borderRadius: "8px",
          color: "#A66A00",
          fontWeight: 700,
          padding: "6px",
          cursor: "pointer",
        }}
      >
        해지
      </button>

      <button
        onClick={onDelete}
        style={{
          background: "#fff",
          border: "1px solid #FF6B6B",
          borderRadius: "8px",
          color: "#FF6B6B",
          fontWeight: 600,
          padding: "6px",
          cursor: "pointer",
        }}
      >
        삭제
      </button>
    </div>
  </div>
);

const Modal = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
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
        background: "#fff",
        padding: "40px 60px",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        textAlign: "center",
        minWidth: "420px",
      }}
    >
      {children}
    </div>
  </div>
);

const alertBoxStyle = {
  border: "1px solid #aaa",
  borderRadius: "10px",
  padding: "24px 30px",
  backgroundColor: "#fafafa",
  marginBottom: "24px",
};

const alertTitle = {
  fontSize: "16px",
  fontWeight: 700,
  marginBottom: "6px",
};

const alertText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: 1.6,
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid " + "#ccc",
};

export default SubscriptionPage;
