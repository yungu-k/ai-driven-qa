// 「그냥 오락실」 랭킹 주고받기(화면 쪽). 서버는 /api/rank/<game>(GET 상위 10, POST 한 줄).
// 서버가 없거나 실패해도 게임은 멈추지 않는다: GET 실패 = null, POST 실패 = null(「지금은 등록이 안 된다」).

export type ScoreRow = { name: string; score: number; say: string; date: string };

function isRow(r: unknown): r is ScoreRow {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return typeof o.name === "string" && typeof o.score === "number" && typeof o.say === "string" && typeof o.date === "string";
}
const rowsOf = (body: { rows?: unknown }) => (Array.isArray(body.rows) ? body.rows.filter(isRow).slice(0, 10) : null);

export async function fetchTop(game: string): Promise<ScoreRow[] | null> {
  try {
    const res = await fetch(`/api/rank/${game}`, { headers: { accept: "application/json" } });
    return res.ok ? rowsOf(await res.json()) : null;
  } catch {
    return null;
  }
}

export async function submitScore(game: string, entry: { name: string; score: number; say: string; sec: number }): Promise<ScoreRow[] | null> {
  try {
    const res = await fetch(`/api/rank/${game}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry) });
    return res.ok ? rowsOf(await res.json()) : null;
  } catch {
    return null;
  }
}

/** 화면에서 받은 이니셜·한마디를 서버 규칙 꼴로(서버도 다시 거른다) */
export function cleanNameSay(name: string, say: string) {
  return {
    name: name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3),
    say: [...say.replace(/\s+/g, " ").trim()].slice(0, 20).join(""),
  };
}
