// 「그냥 오락실」 게임들의 랭킹 규칙(점수 게임). 서버 src/pages/api/rank/[game].ts 와 단위 테스트가 같이 쓴다.
// 게임을 하나 더하면 GAMES 에 한 줄: 저장 키 · 한 판 최대 길이 · 점수 상한식. 이니셜·한마디는 rank-common 이 거른다.
import { checkNameSay } from "./rank-common.ts";

export type ScoreEntry = { name: string; score: number; say: string; sec: number };
export type ScoreRow = { id: string; name: string; score: number; say: string; date: string };

type Game = {
  key: string; // Redis 정렬 집합 이름
  maxSec: number; // 한 판이 이보다 길 수는 없다(엔진 시계 초)
  /** 버틴 초에 비해 말이 안 되는 점수인가(넉넉한 위쪽 경계) */
  maxScore: (sec: number) => number;
};

export const GAMES: Record<string, Game> = {
  // 새벽 양치기: 버틴 초×10 + 처치 + 최장 양떼×25 + 우리×15 + (이기면 5000 + 남은 양×200). 규격 docs/lab-surv-spec.md 9절 S4
  // 처치는 초당 12, 양떼는 80, 우리는 초당 1 을 넘기 어렵다고 보고 넉넉히 잡는다
  sheep: { key: "surv:sheep:rank", maxSec: 605, maxScore: sec => Math.ceil(sec * (10 + 12 + 15) + 80 * 25 + 5000 + 80 * 200) },
};

export type ScoreCheck = { ok: true; entry: ScoreEntry } | { ok: false; reason: string };

export function checkScoreEntry(game: string, body: unknown): ScoreCheck {
  const G = Object.hasOwn(GAMES, game) ? GAMES[game] : null;
  if (!G) return { ok: false, reason: "game" };
  if (!body || typeof body !== "object") return { ok: false, reason: "shape" };
  const b = body as Record<string, unknown>;
  const ns = checkNameSay(b);
  if (!ns.ok) return ns;
  const { score, sec } = b;
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 0 || sec > G.maxSec) return { ok: false, reason: "sec" };
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) return { ok: false, reason: "score" };
  if (score > G.maxScore(sec)) return { ok: false, reason: "too-high" };
  return { ok: true, entry: { name: ns.name, score, say: ns.say, sec } };
}
