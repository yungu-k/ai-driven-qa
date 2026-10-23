// 버그 잡기 — 규칙만 담는다. 화면·시계·난수는 밖에서 넣는다(테스트가 시간을 건너뛸 수 있게).

export type Kind = "bug" | "gold" | "feature";

export type Hole = {
  kind: Kind | null;
  /** 나타난 시각(ms). 비어 있으면 0 */
  shownAt: number;
  /** 이 시각이 지나면 들어간다 */
  hideAt: number;
};

export type Stats = {
  score: number;
  caught: number;
  gold: number;
  /** 못 잡고 들어간 버그 = 「운영에 나간 버그」 */
  escaped: number;
  /** 「기능」을 잘못 누른 횟수 */
  featureHits: number;
};

export type State = {
  holes: Hole[];
  startedAt: number;
  nextSpawnAt: number;
  over: boolean;
  stats: Stats;
};

export const DURATION_MS = 30_000;
export const HOLE_COUNT = 9;
export const POINTS: Record<Kind, number> = { bug: 1, gold: 3, feature: -2 };

const emptyHole = (): Hole => ({ kind: null, shownAt: 0, hideAt: 0 });

export function createGame(now: number): State {
  return {
    holes: Array.from({ length: HOLE_COUNT }, emptyHole),
    startedAt: now,
    nextSpawnAt: now + 400,
    over: false,
    stats: { score: 0, caught: 0, gold: 0, escaped: 0, featureHits: 0 },
  };
}

/** 0(시작) → 1(끝). 뒤로 갈수록 빨라진다 */
export function progress(s: State, now: number): number {
  return Math.min(1, Math.max(0, (now - s.startedAt) / DURATION_MS));
}

export function remainingMs(s: State, now: number): number {
  return Math.max(0, s.startedAt + DURATION_MS - now);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 다음 등장까지 간격: 850ms → 420ms */
export const spawnGap = (p: number) => lerp(850, 420, p);
/** 머무는 시간: 1300ms → 700ms */
export const stayMs = (p: number) => lerp(1300, 700, p);

export function pickKind(r: number): Kind {
  if (r < 0.08) return "gold";
  if (r < 0.25) return "feature";
  return "bug";
}

/**
 * 시간을 now 까지 진행한다. 들어간 버그는 escaped 로 센다.
 * 돌려주는 값: 이번에 새로 나온 구멍 번호들(화면이 등장 효과를 붙인다)
 */
export function tick(s: State, now: number, rand: () => number): number[] {
  if (s.over) return [];

  const end = s.startedAt + DURATION_MS;
  const until = Math.min(now, end);

  for (const h of s.holes) {
    if (h.kind && h.hideAt <= until) {
      if (h.kind !== "feature") s.stats.escaped++;
      Object.assign(h, emptyHole());
    }
  }

  const spawned: number[] = [];
  // 탭이 멈췄다 돌아와도 한꺼번에 쏟아지지 않게 한 번에 하나만 낸다
  if (s.nextSpawnAt <= until) {
    const free = s.holes.flatMap((h, i) => (h.kind ? [] : [i]));
    if (free.length > 0) {
      const i = free[Math.floor(rand() * free.length)];
      const p = progress(s, until);
      s.holes[i] = { kind: pickKind(rand()), shownAt: until, hideAt: until + stayMs(p) };
      spawned.push(i);
    }
    s.nextSpawnAt = until + spawnGap(progress(s, until));
  }

  if (now >= end) {
    // 끝나는 순간 떠 있던 버그는 놓친 것으로 치지 않는다 — 시간이 끝났지 사람이 놓친 게 아니다
    for (let i = 0; i < s.holes.length; i++) s.holes[i] = emptyHole();
    s.over = true;
  }
  return spawned;
}

/** 구멍을 눌렀다. 맞힌 것의 종류를 돌려준다(빈 구멍이면 null) */
export function hit(s: State, index: number, now: number): Kind | null {
  if (s.over) return null;
  const h = s.holes[index];
  if (!h || !h.kind || h.hideAt <= now) return null;

  const kind = h.kind;
  s.stats.score = Math.max(0, s.stats.score + POINTS[kind]);
  if (kind === "bug") s.stats.caught++;
  if (kind === "gold") {
    s.stats.caught++;
    s.stats.gold++;
  }
  if (kind === "feature") s.stats.featureHits++;
  s.holes[index] = emptyHole();
  return kind;
}

/** 점수 → 칭호 */
export function rankFor(score: number): string {
  if (score >= 45) return "버그 사냥 전설";
  if (score >= 35) return "QA Lead";
  if (score >= 25) return "시니어 QA";
  if (score >= 12) return "주니어 QA";
  return "견습 테스터";
}
