// 릴리스 디펜스 랭킹 서버(블로그에서 유일하게 서버에서 도는 길). 저장소는 Upstash Redis(REST, 무료 범위).
//  GET    → 상위 10 { rows }
//  POST   {name, lap, say, simSec} → 거르고 넣은 뒤 새 상위 10. 같은 기기(IP 해시) 30초에 한 번
//  DELETE ?id=…  (Authorization: Bearer ADMIN_TOKEN) → 한 줄 지우기(Dean 몫)
// IP 는 저장하지 않는다: 솔트 넣은 해시를 30초짜리 키 이름으로만 쓰고 저절로 사라진다.
import type { APIRoute } from "astro";
import { checkEntry, scoreOf, kstDate, type Row } from "@/lab/release-defense/rank-rules";

export const prerender = false;

const KEY = "defense:rank";
const KEEP = 100; // 상위 100줄만 남긴다
const env = (k: string) => process.env[k] ?? "";
const REDIS_URL = () => env("KV_REST_API_URL") || env("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = () => env("KV_REST_API_TOKEN") || env("UPSTASH_REDIS_REST_TOKEN");

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

async function top(n = 10): Promise<Omit<Row, "id">[]> {
  const raw = (await redis("ZRANGE", KEY, 0, n - 1, "REV")) as string[];
  return raw.flatMap(s => {
    try {
      const { name, lap, say, date } = JSON.parse(s) as Row;
      return [{ name, lap, say, date }];
    } catch {
      return [];
    }
  });
}

async function ipKey(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const data = new TextEncoder().encode(env("IP_SALT") + "|" + ip);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return "defense:rl:" + Array.from(h.slice(0, 12), b => b.toString(16).padStart(2, "0")).join("");
}

const ready = () => !!REDIS_URL() && !!REDIS_TOKEN();

export const GET: APIRoute = async () => {
  if (!ready()) return json({ rows: [] }, 503);
  try {
    return json({ rows: await top() }, 200, { "cache-control": "public, s-maxage=30, stale-while-revalidate=300" });
  } catch {
    return json({ rows: [] }, 502);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!ready()) return json({ error: "not-ready" }, 503);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "shape" }, 400);
  }
  const c = checkEntry(body);
  if (!c.ok) return json({ error: c.reason }, 400);
  try {
    // 같은 기기 30초에 한 번: 키가 이미 있으면 SET NX 가 null 을 돌려준다
    if ((await redis("SET", await ipKey(request), "1", "NX", "EX", 30)) === null) return json({ error: "slow-down" }, 429);
    const now = Date.now();
    const row: Row = { id: crypto.randomUUID(), name: c.entry.name, lap: c.entry.lap, say: c.entry.say, date: kstDate(now) };
    await redis("ZADD", KEY, scoreOf(row.lap, now), JSON.stringify(row));
    await redis("ZREMRANGEBYRANK", KEY, 0, -(KEEP + 1));
    return json({ rows: await top() });
  } catch {
    return json({ error: "store" }, 502);
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const admin = env("ADMIN_TOKEN");
  if (!admin || request.headers.get("authorization") !== `Bearer ${admin}`) return json({ error: "auth" }, 401);
  if (!ready()) return json({ error: "not-ready" }, 503);
  const id = url.searchParams.get("id");
  const all = (await redis("ZRANGE", KEY, 0, -1, "REV")) as string[];
  if (!id) return json({ rows: all.map(s => JSON.parse(s) as Row) }); // id 없이 부르면 지울 줄을 고르게 전부(id 포함) 보여 준다
  const hit = all.find(s => (JSON.parse(s) as Row).id === id);
  if (!hit) return json({ error: "no-such-id" }, 404);
  await redis("ZREM", KEY, hit);
  return json({ removed: id });
};
