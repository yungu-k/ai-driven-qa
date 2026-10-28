// 코코 타워 디펜스 랭킹(바퀴=날 기록) — 서버가 받는 값의 규칙(순수 함수). 서버 src/pages/api/defense-rank.ts 와 단위 테스트가 같이 쓴다.
// 저장하는 것은 이니셜·한마디·바퀴·날짜뿐(개인정보 없음). 거르는 것: 꼴이 틀린 값, 링크, 욕설, 말이 안 되는 기록.

import { checkNameSay, orderScore, kstDate, SAY_MAX } from "../rank-common.ts";

export { kstDate, SAY_MAX };
export const MAX_LAP = 999;
/** 한 바퀴(맵 5장, 46웨이브)를 엔진 시계로 이보다 빨리 깰 수는 없다고 본다. 기준 봇 46분·조기 호출 전부 써도 30분대라 넉넉히 낮춘 값 */
export const MIN_SIM_SEC_PER_LAP = 600;

export type Entry = { name: string; lap: number; say: string; simSec: number };
export type Row = { id: string; name: string; lap: number; say: string; date: string };

export type Check = { ok: true; entry: Entry } | { ok: false; reason: string };

export function checkEntry(body: unknown): Check {
  if (!body || typeof body !== "object") return { ok: false, reason: "shape" };
  const b = body as Record<string, unknown>;
  const ns = checkNameSay(b);
  if (!ns.ok) return ns;
  const lap = b.lap, simSec = b.simSec;
  if (typeof lap !== "number" || !Number.isInteger(lap) || lap < 0 || lap > MAX_LAP) return { ok: false, reason: "lap" };
  if (typeof simSec !== "number" || !Number.isFinite(simSec) || simSec < 0) return { ok: false, reason: "simSec" };
  if (simSec < lap * MIN_SIM_SEC_PER_LAP) return { ok: false, reason: "too-fast" };
  return { ok: true, entry: { name: ns.name, lap, say: ns.say, simSec } };
}

/** 정렬 점수: 바퀴가 높을수록 위, 같은 바퀴면 먼저 등록한 사람이 위(규격 12절 5) */
export function scoreOf(lap: number, nowMs: number) {
  return orderScore(lap, nowMs);
}
