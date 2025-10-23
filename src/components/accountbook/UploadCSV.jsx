// src/components/accountbook/UploadCSV.jsx
import { useRef, useState } from "react";
import { saveMany, loadRange } from "../../api/consumption";
import { upsertMemo } from "../../api/memo";

// 서버 응답 내역 정규화 (id/category/date/amount 보장)
const normalizeConsumption = (raw) => {
  const x = raw ?? {};
  const id =
    x.id ??
    x.consumptionId ??
    x.seq ??
    x.pk ??
    x._id ??
    null;

  const category =
    (typeof x.category === "string" ? x.category : null) ??
    x.categoryName ??
    x.cat ??
    x.type ??
    x.consumptionCategory ??
    (typeof x.category === "object" ? (x.category?.name ?? x.category?.label ?? x.category?.title) : null) ??
    "";

  const dateRaw =
    x.date ??
    x.useDate ??
    x.spentDate ??
    x.paymentDate ??
    x.createdDate ??
    x.created_at ??
    x.createdAt ??
    "";
  const date =
    typeof dateRaw === "string"
      ? dateRaw.slice(0, 10)
      : "";

  const amountRaw =
    x.amount ??
    x.price ??
    x.money ??
    x.cost ??
    x.value ??
    0;
  const amount = Number(amountRaw ?? 0);

  const memo =
    x.memo ??
    x.description ??
    x.note ??
    x.desc ??
    "";

  return { ...x, id, category, date, amount, memo };
};

// 응답을 배열로 정규화
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  return [];
};

export default function UploadCSV({ onComplete }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsText(file, "utf-8");
    });

  // 간단 CSV 파서 (따옴표/콤마 대응)
  const splitCSVLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const parseCSV = (text) => {
    // BOM 제거
    if (text && text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
    const findIdx = (...cands) =>
      header.findIndex((h) => cands.map((c) => c.toLowerCase()).includes(h));

    const idxDate = findIdx("date", "날짜");
    const idxCat = findIdx("category", "카테고리");
    const idxAmt = findIdx("amount", "금액");
    const idxMemo = findIdx("memo", "메모", "내용", "설명", "subcategory", "소분류"); // 선택

    if (idxDate < 0 || idxCat < 0 || idxAmt < 0) {
      throw new Error("CSV 헤더에 날짜(date), 카테고리(category), 금액(amount)가 필요합니다.");
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const rawDate = cols[idxDate] ?? "";
      const rawCat = cols[idxCat] ?? "";
      const rawAmt = cols[idxAmt] ?? "";
      const rawMemo = idxMemo >= 0 ? cols[idxMemo] ?? "" : "";

      // 정규화
      const date = normalizeDate(rawDate);
      const memoForCat = String(rawMemo || "");
      const category = normalizeCategory(rawCat, memoForCat);
      const amount = normalizeAmount(rawAmt);
      const memo = memoForCat.trim();

      if (!date || !category || amount == null || isNaN(amount)) continue;
      if (amount < 0) continue; // 서버 스키마: 0 이상만 허용

      rows.push({ date, category, amount, memo });
    }
    return rows;
  };

  const normalizeDate = (s) => {
    if (!s) return null;
    s = String(s).trim().replace(/[./]/g, "-");
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    const y = m[1];
    const mo = String(parseInt(m[2], 10)).padStart(2, "0");
    const d = String(parseInt(m[3], 10)).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  };

  const normalizeAmount = (s) => {
    if (s == null) return null;
    const cleaned = String(s).replace(/[^\d-]/g, "");
    if (cleaned === "" || cleaned === "-") return null;
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  };

  // 카테고리 별칭 → 정규 카테고리
  const normalizeCategory = (s, memo = "") => {
    const raw = String(s || "").toLowerCase();
    const m = String(memo || "").toLowerCase();
    const hit = (arr) => arr.some((k) => raw.includes(k) || m.includes(k));

    if (hit(["카페", "간식", "디저트", "커피", "베이커리"])) return "카페/간식";
    if (hit(["병원", "약국", "의료", "건강", "치과"])) return "의료/건강";
    if (hit(["문화", "영화", "도서", "책", "여가", "공연"])) return "문화/여가";
    if (hit(["통신", "휴대폰", "핸드폰", "인터넷"])) return "통신";
    if (hit(["주거", "관리비", "월세", "전세", "전기", "가스", "수도"])) return "주거";
    if (hit(["교통", "버스", "지하철", "택시", "주유", "유류", "대중교통", "톨"])) return "교통";
    if (hit(["쇼핑", "패션", "의류", "잡화", "구매"])) return "쇼핑";
    if (hit(["구독", "넷플릭스", "youtube", "유튜브", "멜론", "스포티파이", "prime"])) return "구독";
    if (hit(["식비", "식사", "음식", "배달", "점심", "저녁", "아침", "푸드"])) return "식비";
    if (hit(["생활", "생필품", "편의점", "마트", "슈퍼"])) return "생활";
    if (raw === "기타" || m.includes("기타")) return "기타";
    return "기타";
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await readFile(file);
      const rows = parseCSV(text);
      if (rows.length === 0) {
        alert("유효한 데이터가 없습니다.");
        return;
      }

      // 1) 본문 저장
      const payload = rows.map(({ date, category, amount }) => ({ date, category, amount }));
      const created = await saveMany(payload);

      // 2) id 매칭
      let idByIndex = [];
      const createdArr = asArray(created).map(normalizeConsumption).filter((x) => x && x.id != null);
      if (createdArr.length === rows.length) {
        // 응답이 순서 보장 + id 포함인 경우
        idByIndex = createdArr.map((x) => x.id);
      } else {
        // 응답에 id가 없거나 개수가 다르면 재조회로 매칭
        const dates = rows.map((r) => r.date).sort(); // YYYY-MM-DD 정렬 가능
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const fresh = await loadRange(startDate, endDate, { page: 0, size: 5000 });
        const list = asArray(fresh).map(normalizeConsumption);

        // key: "date|category|amount" -> 내역들(최신 id 우선)
        const keyOf = (o) => `${o.date}|${o.category}|${Number(o.amount)}`;
        const groups = new Map();
        for (const it of list) {
          const k = keyOf(it);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(it);
        }
        // 최신(큰 id) 우선
        for (const [k, arr] of groups) {
          arr.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
          groups.set(k, arr);
        }

        const used = new Set();
        idByIndex = rows.map((r) => {
          const k = keyOf(r);
          const arr = groups.get(k) || [];
          const cand = arr.find((x) => !used.has(String(x.id)));
          if (cand && cand.id != null) {
            used.add(String(cand.id));
            return cand.id;
          }
          return null;
        });
      }

      // 3) 메모 저장 (선택: 공백은 건너뜀)
      const memoPairs = rows
        .map((r, i) => ({ id: idByIndex[i], memo: (r.memo ?? "").trim() }))
        .filter((p) => p.id != null && p.memo.length > 0);

      if (memoPairs.length > 0) {
        await Promise.allSettled(
          memoPairs.map((p) => upsertMemo(p.id, p.memo))
        );
      }

      alert(`${rows.length}건 저장 완료${memoPairs.length ? ` (메모 ${memoPairs.length}건)` : ""}`);
      onComplete?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={onFile}
      />
      <button
        onClick={handleClick}
        disabled={busy}
        title="CSV로 여러 건을 한 번에 업로드"
        style={{
          backgroundColor: "#fff",
          border: "1px solid #000",
          borderRadius: 8,
          padding: "10px 16px",
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer"
        }}
      >
        {busy ? "업로드 중..." : "CSV 업로드"}
      </button>
    </>
  );
}