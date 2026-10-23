// UI 버그 찾기 — 규칙만 담는다. 화면(DOM)·시계는 밖에서 넣는다(테스트가 시간을 건너뛸 수 있게).
// 판정은 좌표가 아니라 「탭한 요소가 버그 영역 안인가」로 한다 — 글꼴·폭이 달라도 같은 답이 나오게.

export type Bug = {
  id: string;
  /** 버그 영역 선택자. 비우면 [data-bug="id"] */
  area?: string;
  /** 무엇을 바꿔 심었나(만드는 사람용 메모) */
  change: string;
  /** 찾았을 때 보여 줄 한 줄 설명 */
  desc: string;
};

/** 화면 템플릿이 받는 스위치. 기획서 = 아무것도 안 켬 + 표시 없음, 실제 빌드 = 다 켬 + 표시 */
export type Variant = {
  /** 이 버그가 켜져 있나 */
  on(id: string): boolean;
  /** 켜져 있고 표시를 붙이는 판이면 ` data-bug="id"`, 아니면 빈 글자 */
  mark(id: string): string;
  /** on(id) 이면 build, 아니면 spec */
  pick<T>(id: string, spec: T, build: T): T;
};

export type Level = {
  id: string;
  /** 단계 이름(화면 종류) */
  title: string;
  /** 가상 앱 이름 */
  app: string;
  /** 단계 시작 때 한 줄 */
  brief: string;
  bugs: Bug[];
  render(v: Variant): string;
};

export function makeVariant(active: Iterable<string>, marks: boolean): Variant {
  const set = new Set(active);
  const on = (id: string) => set.has(id);
  return {
    on,
    mark: id => (marks && on(id) ? ` data-bug="${id}"` : ""),
    pick: (id, spec, build) => (on(id) ? build : spec),
  };
}

export const renderSpec = (lv: Level) => lv.render(makeVariant([], false));
export const renderBuild = (lv: Level) =>
  lv.render(makeVariant(lv.bugs.map(b => b.id), true));

export const areaOf = (b: Bug) => b.area ?? `[data-bug="${b.id}"]`;

/** DOM Element 중 판정에 쓰는 부분만 — 테스트가 가짜를 넣을 수 있게 */
export type Tappable = { closest(selector: string): unknown };

/** 탭한 요소가 어느 버그 영역 안인지. 안쪽 영역이 먼저 걸리게 버그 순서대로 본다. 빈 곳이면 null */
export function bugAt(lv: Level, target: Tappable | null): string | null {
  if (!target) return null;
  for (const b of lv.bugs) if (target.closest(areaOf(b))) return b.id;
  return null;
}

export type Run = {
  startedAt: number;
  /** 끝난 시각. 진행 중이면 null */
  endedAt: number | null;
  /** 찾은 순서대로 */
  found: string[];
  misses: number;
  hints: number;
  /** 다 못 찾고 넘겼나 */
  skipped: boolean;
};

export type Game = {
  levels: Level[];
  index: number;
  runs: Run[];
  over: boolean;
};

const newRun = (now: number): Run => ({
  startedAt: now,
  endedAt: null,
  found: [],
  misses: 0,
  hints: 0,
  skipped: false,
});

export function createGame(levels: Level[], now: number): Game {
  return { levels, index: 0, runs: [newRun(now)], over: false };
}

export const currentLevel = (g: Game) => g.levels[g.index];
export const currentRun = (g: Game) => g.runs[g.index];
export const levelDone = (g: Game) => currentRun(g).endedAt !== null;

export type TapResult =
  | { kind: "found"; bug: Bug; cleared: boolean }
  | { kind: "again"; bug: Bug }
  | { kind: "miss" }
  | { kind: "ignored" };

/** 실제 빌드 화면을 탭했다. bugId = bugAt() 의 답(빈 곳이면 null) */
export function tap(g: Game, bugId: string | null, now: number): TapResult {
  if (g.over || levelDone(g)) return { kind: "ignored" };
  const run = currentRun(g);
  const bug = bugId ? currentLevel(g).bugs.find(b => b.id === bugId) : undefined;
  if (!bug) {
    run.misses++;
    return { kind: "miss" };
  }
  // 이미 찾은 버그를 다시 누른 건 실수도 아니고 점수도 아니다
  if (run.found.includes(bug.id)) return { kind: "again", bug };
  run.found.push(bug.id);
  const cleared = run.found.length === currentLevel(g).bugs.length;
  if (cleared) run.endedAt = now;
  return { kind: "found", bug, cleared };
}

/** 힌트: 아직 못 찾은 버그 하나(데이터 순서로 첫 번째). 끝났거나 다 찾았으면 null */
export function hint(g: Game): Bug | null {
  if (g.over || levelDone(g)) return null;
  const run = currentRun(g);
  const left = currentLevel(g).bugs.find(b => !run.found.includes(b.id));
  if (!left) return null;
  run.hints++;
  return left;
}

/** 다 못 찾았지만 이 단계를 끝낸다. 못 찾은 버그를 돌려준다(화면이 보여 준다) */
export function skip(g: Game, now: number): Bug[] {
  if (g.over || levelDone(g)) return [];
  const run = currentRun(g);
  run.skipped = true;
  run.endedAt = now;
  return currentLevel(g).bugs.filter(b => !run.found.includes(b.id));
}

/** 다음 단계로. 이 단계가 안 끝났으면 안 넘어간다. 마지막이었으면 over */
export function nextLevel(g: Game, now: number): boolean {
  if (g.over || !levelDone(g)) return false;
  if (g.index + 1 >= g.levels.length) {
    g.over = true;
    return false;
  }
  g.index++;
  g.runs.push(newRun(now));
  return true;
}

export type LevelResult = {
  found: number;
  total: number;
  misses: number;
  hints: number;
  ms: number;
};

export function levelResult(g: Game, i: number, now: number): LevelResult {
  const run = g.runs[i];
  return {
    found: run.found.length,
    total: g.levels[i].bugs.length,
    misses: run.misses,
    hints: run.hints,
    ms: (run.endedAt ?? now) - run.startedAt,
  };
}

export type Summary = LevelResult & { levels: number; rank: string };

/** 지금까지 시작한 단계들의 합. total 은 시작한 단계의 버그 수만 센다 */
export function summary(g: Game, now: number): Summary {
  const rs = g.runs.map((_, i) => levelResult(g, i, now));
  const sum = (k: keyof LevelResult) => rs.reduce((a, r) => a + r[k], 0);
  const s = {
    levels: rs.length,
    found: sum("found"),
    total: sum("total"),
    misses: sum("misses"),
    hints: sum("hints"),
    ms: sum("ms"),
  };
  return { ...s, rank: rankFor(s.found, s.total, s.misses, s.hints) };
}

/** 찾은 비율 → 칭호. 실수·힌트는 한 단계씩 깎는다 */
export function rankFor(found: number, total: number, misses: number, hints: number): string {
  const ranks = ["견습 테스터", "주니어 QA", "시니어 QA", "QA Lead", "픽셀 탐정"];
  if (total === 0) return ranks[0];
  let r = found === total ? 4 : found / total >= 0.75 ? 3 : found / total >= 0.5 ? 2 : found > 0 ? 1 : 0;
  if (misses > total) r--;
  if (hints > 0) r--;
  return ranks[Math.max(0, r)];
}

/** ms → 「1분 05초」 */
export function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return m > 0 ? `${m}분 ${ss}초` : `${s % 60}초`;
}
