// 릴리스 디펜스 — 이어하기 저장(규격 2절, D2: 맵을 깰 때마다). 순수 함수만 두고 localStorage 는 부르는 쪽 몫.
// 웨이브 중간은 저장하지 않는다. 저장이 막힌 창(사생활 보호 등)이면 저장 없이 돈다.

import { DATA, type Legend } from "./engine.ts";

export const SAVE_KEY = "lab.defense";
export const MAP_COUNT = 5;

export type { Legend };
export type Run = {
  lap: number; // 지금 도는 바퀴(1 = v1.0)
  map: number; // 다음에 할 맵 번호(0–4)
  legends: Legend[];
  best: number; // 이 기기에서 깬 가장 높은 바퀴 수
  simSec: number; // 이번 판 동안 엔진 시계로 흐른 초(진 맵 다시 하기 포함) — 랭킹 서버의 「말 안 되는 기록」 거르기용
};

export function freshRun(best = 0): Run {
  return { lap: 1, map: 0, legends: [], best, simSec: 0 };
}

/** 깬 바퀴 수 = 보스까지 깬 마지막 바퀴. v1.0 도 못 깼으면 0(규격 12절) */
export function clearedLaps(run: Run): number {
  return run.lap - 1;
}

/** 맵 하나를 깼다. 보스 맵이면 바퀴가 오르고 맵 1로 돌아간다(전설은 부르는 쪽이 addLegend 로 먼저 고친다) */
export function afterMapWon(run: Run, simSec: number): Run {
  const next: Run = { ...run, legends: run.legends.map(l => ({ ...l })), simSec: run.simSec + simSec };
  if (run.map + 1 >= MAP_COUNT) {
    next.lap = run.lap + 1;
    next.map = 0;
    next.best = Math.max(run.best, run.lap);
  } else {
    next.map = run.map + 1;
  }
  return next;
}

/** 저장된 글을 믿지 않고 모양을 확인한다. 틀리면 null(새로 시작) */
export function parseRun(raw: string | null): Run | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
  if (!int(r.lap, 1, 999) || !int(r.map, 0, MAP_COUNT - 1) || !int(r.best, 0, 999)) return null;
  if (!Array.isArray(r.legends) || r.legends.length > 2) return null;
  const legends: Legend[] = [];
  for (const l of r.legends) {
    if (!l || typeof l !== "object") return null;
    const { kind, lv } = l as Record<string, unknown>;
    if (typeof kind !== "string" || !Object.hasOwn(DATA.LEGENDS.kinds, kind) || !int(lv, 1, DATA.LEGENDS.maxLv)) return null;
    legends.push({ kind: kind as Legend["kind"], lv: lv as number });
  }
  const simSec = typeof r.simSec === "number" && r.simSec >= 0 && Number.isFinite(r.simSec) ? r.simSec : 0;
  return { lap: r.lap as number, map: r.map as number, legends, best: r.best as number, simSec };
}

/** 이어할 것이 있나 — 첫 바퀴 첫 맵이면 새 판과 같다 */
export function hasProgress(run: Run | null): boolean {
  return !!run && (run.lap > 1 || run.map > 0);
}
