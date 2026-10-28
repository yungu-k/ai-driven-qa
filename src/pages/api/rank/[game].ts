// 「그냥 오락실」 게임 랭킹 서버 — 게임마다 한 판(정렬 집합 하나). 규칙은 src/lab/arcade-rank-rules.ts, 저장소는 Upstash Redis(REST).
//  GET    /api/rank/<game>        → 상위 10 { ok: true, rows } · 실패면 { ok: false, error, rows: [] }
//  POST   /api/rank/<game>  {name, score, say, sec} → 거르고 넣은 뒤 새 상위 10. 같은 기기(IP 해시) 30초에 한 번(게임마다)
//  DELETE /api/rank/<game>?id=…  (Authorization: Bearer ADMIN_TOKEN) → 한 줄 지우기. id 없으면 전체(id 포함) 목록
// 릴리스 디펜스는 바퀴 기록이라 따로(/api/defense-rank). IP 는 솔트 넣은 해시를 30초짜리 키 이름으로만 쓴다.
import type { APIRoute } from "astro";
import { GAMES, checkScoreEntry, type ScoreRow } from "@/lab/arcade-rank-rules";
import { orderScore, kstDate } from "@/lab/rank-common";

export const prerender = false;

const KEEP = 100;
const env = (k: string) => process.env[k] ?? "";
const REDIS_URL = () => env("KV_REST_API_URL") || env("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = () => env("KV_REST_API_TOKEN") || env("UPSTASH_REDIS_REST_TOKEN");
const ready = () => !!REDIS_URL() && !!REDIS_TOKEN();

async function redis(...cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL(), {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN()}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `redis ${res.status}`);
  return body.result;
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });
}

async function top(key: string, n = 10): Promise<Omit<ScoreRow, "id">[]> {
  const raw = (await redis("ZRANGE", key, 0, n - 1, "REV")) as string[];
  return raw.flatMap(s => {
    try {
      const { name, score, say, date } = JSON.parse(s) as ScoreRow;
      return [{ name, score, say, date }];
    } catch {
      return [];
    }
  });
}

async function ipKey(req: Request, game: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env("IP_SALT") + "|" + ip)));
  return `surv:rl:${game}:` + Array.from(h.slice(0, 12), b => b.toString(16).padStart(2, "0")).join("");
}

const gameOf = (p: Record<string, string | undefined>) => (p.game && Object.hasOwn(GAMES, p.game) ? p.game : null);

export const GET: APIRoute = async ({ params }) => {
  const game = gameOf(params);
  if (!game) return json({ ok: false, error: "game", rows: [] }, 404);
  if (!ready()) return json({ ok: false, error: "not-ready", rows: [] }, 503);
  try {
    return json({ ok: true, rows: await top(GAMES[game].key) }, 200, { "cache-control": "public, s-maxage=30, stale-while-revalidate=300" });
  } catch {
    return json({ ok: false, error: "store", rows: [] }, 502);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const game = gameOf(params);
  if (!game) return json({ error: "game" }, 404);
  if (!ready()) return json({ error: "not-ready" }, 503);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "shape" }, 400);
  }
  const c = checkScoreEntry(game, body);
  if (!c.ok) return json({ error: c.reason }, 400);
  try {
    if ((await redis("SET", await ipKey(request, game), "1", "NX", "EX", 30)) === null) return json({ error: "slow-down" }, 429);
    const now = Date.now(), key = GAMES[game].key;
    const row: ScoreRow = { id: crypto.randomUUID(), name: c.entry.name, score: c.entry.score, say: c.entry.say, date: kstDate(now) };
    await redis("ZADD", key, orderScore(row.score, now), JSON.stringify(row));
    await redis("ZREMRANGEBYRANK", key, 0, -(KEEP + 1));
    return json({ ok: true, rows: await top(key) });
  } catch {
    return json({ error: "store" }, 502);
  }
};

export const DELETE: APIRoute = async ({ params, request, url }) => {
  const game = gameOf(params);
  if (!game) return json({ error: "game" }, 404);
  const admin = env("ADMIN_TOKEN");
  if (!admin || request.headers.get("authorization") !== `Bearer ${admin}`) return json({ error: "auth" }, 401);
  if (!ready()) return json({ error: "not-ready" }, 503);
  const key = GAMES[game].key, id = url.searchParams.get("id");
  const all = (await redis("ZRANGE", key, 0, -1, "REV")) as string[];
  if (!id) return json({ rows: all.map(s => JSON.parse(s) as ScoreRow) });
  const hit = all.find(s => (JSON.parse(s) as ScoreRow).id === id);
  if (!hit) return json({ error: "no-such-id" }, 404);
  await redis("ZREM", key, hit);
  return json({ removed: id });
};
