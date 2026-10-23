// 버그 2048 — 규칙만 담는다. 화면·난수는 밖에서 넣는다(테스트가 판을 고정할 수 있게).
// 판은 길이 16 배열(행 우선), 0 은 빈칸.

export const SIZE = 4;
export const WIN = 2048;

export type Dir = "left" | "right" | "up" | "down";

type Snapshot = { board: number[]; score: number; over: boolean; won: boolean };

export type State = {
  board: number[];
  score: number;
  /** 더 못 움직인다 */
  over: boolean;
  /** 2048 에 한 번이라도 닿았다 */
  won: boolean;
  /** 2048 뒤에도 계속하기로 했다 */
  keepPlaying: boolean;
  /** 되돌리기 남은 횟수(판마다 1) */
  undoLeft: number;
  /** 바로 전 수의 모습. 되돌리기용 */
  prev: Snapshot | null;
};

export type MoveResult = {
  moved: boolean;
  gained: number;
  /** 이번에 합쳐져 생긴 칸 번호들 */
  merged: number[];
  /** 새로 나온 칸 번호(안 나왔으면 null) */
  spawned: number | null;
};

/**
 * 한 줄을 앞(0번)으로 민다. 한 번 합쳐진 타일은 그 수 안에서 다시 합쳐지지 않는다.
 * [2,2,2,2] → [4,4,0,0], [2,2,4,0] → [4,4,0,0]
 */
export function slideLine(line: number[]): { line: number[]; gained: number; mergedAt: number[] } {
  const tiles = line.filter(v => v !== 0);
  const out: number[] = [];
  const mergedAt: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const v = tiles[i] * 2;
      mergedAt.push(out.length);
      out.push(v);
      gained += v;
      i++; // 짝이 된 다음 타일은 건너뛴다
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained, mergedAt };
}

/** 방향별로 줄을 이루는 칸 번호들. 각 줄은 「미는 쪽」이 0번이다 */
export function linesFor(dir: Dir): number[][] {
  const lines: number[][] = [];
  for (let a = 0; a < SIZE; a++) {
    const line: number[] = [];
    for (let b = 0; b < SIZE; b++) {
      if (dir === "left") line.push(a * SIZE + b);
      else if (dir === "right") line.push(a * SIZE + (SIZE - 1 - b));
      else if (dir === "up") line.push(b * SIZE + a);
      else line.push((SIZE - 1 - b) * SIZE + a);
    }
    lines.push(line);
  }
  return lines;
}

/** 빈칸 하나에 2(90%) 또는 4(10%)를 놓는다. 빈칸이 없으면 null */
export function spawn(board: number[], rand: () => number): number | null {
  const free = board.flatMap((v, i) => (v === 0 ? [i] : []));
  if (free.length === 0) return null;
  const i = free[Math.min(free.length - 1, Math.floor(rand() * free.length))];
  board[i] = rand() < 0.9 ? 2 : 4;
  return i;
}

/** 빈칸이 있거나, 옆(가로·세로)에 같은 수가 있으면 움직일 수 있다 */
export function canMove(board: number[]): boolean {
  for (let i = 0; i < board.length; i++) {
    const v = board[i];
    if (v === 0) return true;
    const col = i % SIZE;
    if (col < SIZE - 1 && board[i + 1] === v) return true;
    if (i + SIZE < board.length && board[i + SIZE] === v) return true;
  }
  return false;
}

export function createGame(rand: () => number): State {
  const board = Array<number>(SIZE * SIZE).fill(0);
  spawn(board, rand);
  spawn(board, rand);
  return { board, score: 0, over: false, won: false, keepPlaying: false, undoLeft: 1, prev: null };
}

/** 2048 에 닿고 「계속하기」를 아직 안 눌렀으면 멈춰 있다 */
export const paused = (s: State) => s.won && !s.keepPlaying;

export function move(s: State, dir: Dir, rand: () => number): MoveResult {
  const none: MoveResult = { moved: false, gained: 0, merged: [], spawned: null };
  if (s.over || paused(s)) return none;

  const next = s.board.slice();
  const merged: number[] = [];
  let gained = 0;
  for (const idx of linesFor(dir)) {
    const r = slideLine(idx.map(i => s.board[i]));
    idx.forEach((cell, k) => (next[cell] = r.line[k]));
    for (const k of r.mergedAt) merged.push(idx[k]);
    gained += r.gained;
  }

  const moved = next.some((v, i) => v !== s.board[i]);
  // 아무것도 안 움직였으면 새 타일도 없다 — 난수도 안 쓴다
  if (!moved) return none;

  s.prev = { board: s.board.slice(), score: s.score, over: s.over, won: s.won };
  s.board = next;
  s.score += gained;
  if (!s.won && next.some(v => v >= WIN)) s.won = true;
  const spawned = spawn(s.board, rand);
  if (!canMove(s.board)) s.over = true;
  return { moved, gained, merged, spawned };
}

/** 바로 전 수로 한 번 되돌린다. 됐으면 true */
export function undo(s: State): boolean {
  if (!s.prev || s.undoLeft <= 0) return false;
  s.board = s.prev.board;
  s.score = s.prev.score;
  s.over = s.prev.over;
  s.won = s.prev.won;
  if (!s.won) s.keepPlaying = false;
  s.prev = null;
  s.undoLeft--;
  return true;
}

/** 2048 뒤에 계속한다 */
export function keepGoing(s: State): void {
  if (s.won) s.keepPlaying = true;
}

export const maxTile = (s: State) => Math.max(...s.board);
