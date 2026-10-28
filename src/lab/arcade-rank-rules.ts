// 「그냥 오락실」 게임들의 랭킹 규칙(점수 게임). 서버 src/pages/api/rank/[game].ts 와 단위 테스트가 같이 쓴다.
// 게임을 하나 더하면 GAMES 에 한 줄: 저장 키 · 한 판 최대 길이 · 점수 상한식. 이름·한마디는 rank-common 이 거른다.
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
  // 코코의 꿈 양몰이(옛 새벽 양치기와 규칙·점수식이 같다): 버틴 초×10 + 처치 + 최장 양떼×25 + 우리×15 + (이기면 5000 + 남은 양×200).
  // 처치는 초당 12, 양떼는 80, 우리는 초당 1 을 넘기 어렵다고 보고 넉넉히 잡는다. 옛 판 기록(surv:sheep:rank)과 섞이지 않게 새 키
  dreamherd: { key: "surv:dreamherd:rank", maxSec: 605, maxScore: sec => Math.ceil(sec * (10 + 12 + 15) + 80 * 25 + 5000 + 80 * 200) },
  // 코코의 하루: 버틴 초×10 + 처치 + 가득 스키×30 + (이기면 5000 + 남은 체력×20). 규격 docs/lab-surv-coco-spec.md 6절 B4
  // 기운은 초당 40 이라 가득(100) 스키는 2.5초에 한 번 꼴 → 초당 30×0.4 = 12. 체력은 400 을 넘기 어렵다고 본다
  coco: { key: "surv:coco:rank", maxSec: 605, maxScore: sec => Math.ceil(sec * (10 + 12 + 12) + 5000 + 400 * 20) },
  // 도깨비 퇴치: 버틴 초×10 + 처치 + 체 털기×5 + 한 번에 가장 많이×30 + (이기면 5000 + 남은 체력×20). 규격 docs/lab-surv-goblin-spec.md 6절 A5
  // 털기는 초당 1 번을 넘기 어렵고, 한 번에 앉는 수는 체 셋 × 12 를 넘지 않는다고 넉넉히 본다
  goblin: { key: "surv:goblin:rank", maxSec: 605, maxScore: sec => Math.ceil(sec * (10 + 12 + 5) + 40 * 30 + 5000 + 400 * 20) },
  // 포장마차 사수: 버틴 초×10 + 처치 + 다 먹고 간 손님×40 + (이기면 5000 + 남은 체력×10 + 가게 체력×20). 규격 docs/lab-surv-pocha-spec.md · 점수식 docs/lab-surv-pocha.js score
  // 손님은 가장 잦을 때도 3초에 한 명 와서(규칙 GUEST.every 의 끝값) 다 먹고 간 수는 버틴 초/3 + 2 를 넘지 못한다. 가게 체력은 400 이 끝(고쳐도 최대를 안 넘는다)
  pocha: { key: "surv:pocha:rank", maxSec: 605, maxScore: sec => Math.ceil(sec * (10 + 12) + 40 * (sec / 3 + 2) + 5000 + 400 * 10 + 400 * 20) },
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
