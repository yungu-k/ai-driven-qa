// 코코 타워 디펜스 — 랭킹판 주고받기(규격 12절). 서버는 /api/defense-rank (GET 상위 10, POST 한 줄).
// 서버가 없거나 실패해도 게임은 멈추지 않는다: GET 실패 = 빈 판, POST 실패 = 「지금은 등록이 안 된다」.

export const RANK_URL = "/api/defense-rank";
export const NAME_RE = /^[A-Z0-9]{3}$/;
export const SAY_MAX = 20;

export type RankRow = { name: string; lap: number; say: string; date: string };

/** 화면에서 받은 값을 서버 규칙과 같은 꼴로 다듬는다(서버도 같은 검사를 다시 한다) */
export function cleanEntry(name: string, say: string) {
  const n = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  const s = [...say.replace(/\s+/g, " ").trim()].slice(0, SAY_MAX).join("");
  return { name: n, say: s, ok: NAME_RE.test(n) };
}

function isRow(r: unknown): r is RankRow {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return typeof o.name === "string" && typeof o.lap === "number" && typeof o.say === "string" && typeof o.date === "string";
}

export async function fetchTop(): Promise<RankRow[] | null> {
  try {
    const res = await fetch(RANK_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { rows?: unknown };
    return Array.isArray(body.rows) ? body.rows.filter(isRow).slice(0, 10) : null;
  } catch {
    return null;
  }
}

/** 등록. 성공하면 서버가 돌려준 새 상위 10, 실패하면 null */
export async function submit(entry: { name: string; lap: number; say: string; simSec: number }): Promise<RankRow[] | null> {
  try {
    const res = await fetch(RANK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { rows?: unknown };
    return Array.isArray(body.rows) ? body.rows.filter(isRow).slice(0, 10) : null;
  } catch {
    return null;
  }
}
