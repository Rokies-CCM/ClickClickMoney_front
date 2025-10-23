// src/api/memo.js
import { http } from "./http";

/** 어떤 형태여도 "메모 문자열" 안전 추출 */
function extractMemo(payload) {
  const pick = (obj) => {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) return pick(obj[0] ?? "");
    if (typeof obj === "object") {
      if (Array.isArray(obj.data)) return pick(obj.data[0] ?? "");
      if (Array.isArray(obj.results)) return pick(obj.results[0] ?? "");
      if (Array.isArray(obj.items)) return pick(obj.items[0] ?? "");
      const v =
        obj.memo ??
        obj.value ??
        obj.text ??
        obj.message ??
        obj.data?.memo ??
        obj.data?.value ??
        "";
      return typeof v === "string" ? v : String(v ?? "");
    }
    return String(obj);
  };
  return String(pick(payload)).trim();
}

/**
 * 메모 저장/갱신 (선택 입력)
 * - 서버 DTO: { value: string }
 * - 공백은 저장하지 않음
 * - 일부 서버는 POST 대신 PUT만 허용 → 405면 PUT으로 재시도
 * - 경로가 /memos/{id} 인 서버 폴백도 지원
 */
export const upsertMemo = async (consumptionId, value) => {
  const text = (value ?? "").trim();
  if (!text) return { skipped: true };

  const body = { value: text };

  // 1) POST /memo/{id}
  try {
    return await http("POST", `/memo/${consumptionId}`, body, true);
  } catch (e) {
    // POST 미지원 → PUT 재시도
    if (e.status === 405) {
      try {
        return await http("PUT", `/memo/${consumptionId}`, body, true);
      } catch (e2) {
        if (e2.status === 404 || e2.status === 405) {
          // /memos/{id} 폴백
          try {
            return await http("POST", `/memos/${consumptionId}`, body, true);
          } catch (e3) {
            if (e3.status === 405) {
              return await http("PUT", `/memos/${consumptionId}`, body, true);
            }
            throw e3;
          }
        }
        throw e2;
      }
    }

    // 경로 없음 → /memos/{id} 시도
    if (e.status === 404) {
      try {
        return await http("POST", `/memos/${consumptionId}`, body, true);
      } catch (e2) {
        if (e2.status === 405) {
          return await http("PUT", `/memos/${consumptionId}`, body, true);
        }
        throw e2;
      }
    }

    throw e;
  }
};

/**
 * 메모 단건 조회 → 항상 "문자열" 반환
 * 우선순위:
 *   1) GET /memo/{id}
 *   2) GET /memos/{id}
 *   3) GET /memo?consumptionId={id}
 *   4) GET /consumptions/{id}/memo
 * 모두 실패하면 빈 문자열("") 반환
 */
export const loadMemo = async (consumptionId) => {
  // 1) /memo/{id}
  try {
    const r = await http("GET", `/memo/${consumptionId}`, undefined, true);
    return extractMemo(r);
  } catch (e) {
    if (e.status !== 404 && e.status !== 405) throw e;
  }

  // 2) /memos/{id}
  try {
    const r = await http("GET", `/memos/${consumptionId}`, undefined, true);
    return extractMemo(r);
  } catch (e) {
    if (e.status !== 404 && e.status !== 405) throw e;
  }

  // 3) /memo?consumptionId=
  try {
    const r = await http(
      "GET",
      `/memo?consumptionId=${encodeURIComponent(consumptionId)}`,
      undefined,
      true
    );
    return extractMemo(r);
  } catch (e) {
    if (e.status !== 404 && e.status !== 405) throw e;
  }

  // 4) /consumptions/{id}/memo
  try {
    const r = await http("GET", `/consumptions/${consumptionId}/memo`, undefined, true);
    return extractMemo(r);
  } catch {
    return "";
  }
};