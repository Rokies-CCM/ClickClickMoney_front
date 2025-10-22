// src/utils/safe.js
export const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.items)) return v.items;
  if (v && Array.isArray(v.data)) return v.data;
  if (v && Array.isArray(v.results)) return v.results;
  return [];
};

export async function safeJson(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} | ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Expect JSON, got content-type=${ct}. Snippet: ${text.slice(0, 200)}`);
  }
  return res.json();
}
