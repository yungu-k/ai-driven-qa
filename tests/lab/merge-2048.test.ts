// 실행: node --test tests/lab/merge-2048.test.ts   (Node 22.18+ 는 .ts 를 그대로 돌린다)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slideLine,
  move,
  canMove,
  createGame,
  spawn,
  undo,
  keepGoing,
  paused,
  WIN,
  type State,
  type Dir,
} from "../../src/lab/merge-2048/engine.ts";

// 같은 씨앗이면 같은 판이 나오는 난수
function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

/** 쓰이면 바로 실패하는 난수 — 「새 타일이 안 나와야 한다」를 잰다 */
const noRand = () => {
  throw new Error("난수를 쓰면 안 되는 자리에서 썼다(새 타일이 나왔다)");
};

/** 정해 둔 판으로 시작한다 */
function stateOf(rows: number[][]): State {
  return {
    board: rows.flat(),
    score: 0,
    over: false,
    won: false,
    keepPlaying: false,
    undoLeft: 1,
    prev: null,
  };
}

const rowsOf = (b: number[]) => [0, 1, 2, 3].map(r => b.slice(r * 4, r * 4 + 4));

test("한 줄 밀기: 같은 수는 한 번만 합쳐진다", () => {
  const cases: [number[], number[], number][] = [
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 2, 2, 0], [4, 4, 0, 0], 4],
    [[4, 4, 8, 8], [8, 16, 0, 0], 24],
    [[2, 0, 2, 2], [4, 2, 0, 0], 4],
    [[0, 0, 0, 2], [2, 0, 0, 0], 0],
    [[4, 0, 0, 4], [8, 0, 0, 0], 8],
    [[2, 4, 8, 16], [2, 4, 8, 16], 0],
    [[0, 0, 0, 0], [0, 0, 0, 0], 0],
    [[8, 8, 8, 0], [16, 8, 0, 0], 16],
  ];
  for (const [input, want, gained] of cases) {
    const r = slideLine(input);
    assert.deepEqual(r.line, want, `${input} → ${r.line}`);
    assert.equal(r.gained, gained, `${input} 점수`);
  }
  assert.deepEqual(slideLine([2, 2, 2, 2]).mergedAt, [0, 1]);
});

test("네 방향", () => {
  const start = [
    [2, 0, 0, 2],
    [0, 4, 0, 4],
    [8, 0, 8, 0],
    [0, 0, 0, 16],
  ];
  const want: Record<Dir, number[][]> = {
    left: [
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [16, 0, 0, 0],
      [16, 0, 0, 0],
    ],
    right: [
      [0, 0, 0, 4],
      [0, 0, 0, 8],
      [0, 0, 0, 16],
      [0, 0, 0, 16],
    ],
    up: [
      [2, 4, 8, 2],
      [8, 0, 0, 4],
      [0, 0, 0, 16],
      [0, 0, 0, 0],
    ],
    down: [
      [0, 0, 0, 0],
      [0, 0, 0, 2],
      [2, 0, 0, 4],
      [8, 4, 8, 16],
    ],
  };
  for (const dir of Object.keys(want) as Dir[]) {
    const s = stateOf(start);
    // 새 타일은 빈칸 중 첫 칸에 2 — 판에서 그 칸만 빼고 비교한다
    const r = move(s, dir, () => 0);
    assert.equal(r.moved, true, dir);
    assert.notEqual(r.spawned, null);
    assert.equal(s.board[r.spawned!], 2, "r<0.9 면 2");
    s.board[r.spawned!] = 0;
    assert.deepEqual(rowsOf(s.board), want[dir], dir);
  }
});

test("합쳐진 칸 번호를 돌려준다", () => {
  const s = stateOf([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 4, 4],
  ]);
  const r = move(s, "right", () => 0);
  assert.deepEqual(r.merged.sort((a, b) => a - b), [3, 15]);
  assert.equal(r.gained, 12);
});

test("움직인 게 없으면 새 타일도, 점수도, 되돌리기 기록도 없다", () => {
  const start = [
    [2, 4, 0, 0],
    [8, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const s = stateOf(start);
  const r = move(s, "left", noRand);
  assert.equal(r.moved, false);
  assert.equal(r.spawned, null);
  assert.deepEqual(rowsOf(s.board), start);
  assert.equal(s.score, 0);
  assert.equal(s.prev, null);
  assert.equal(move(s, "up", noRand).moved, false);
});

test("새 타일: 2 는 90%, 4 는 10%, 빈칸에만", () => {
  const b = Array(16).fill(8);
  b[5] = 0;
  const seq = [0.99, 0.8999];
  let k = 0;
  assert.equal(spawn(b, () => seq[k++]), 5, "빈칸이 하나면 거기");
  assert.equal(b[5], 2, "0.8999 → 2");

  const b2 = Array(16).fill(0);
  const seq2 = [0, 0.9];
  k = 0;
  spawn(b2, () => seq2[k++]);
  assert.equal(b2[0], 4, "0.9 → 4");
  assert.equal(spawn(Array(16).fill(2), noRand), null, "꽉 차면 없음");

  // 많이 뽑아 비율을 본다
  const rand = seeded(11);
  let fours = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const t = Array(16).fill(0);
    const at = spawn(t, rand)!;
    if (t[at] === 4) fours++;
  }
  assert.ok(fours / N > 0.07 && fours / N < 0.13, `4 비율 ${fours / N}`);
});

test("새 판은 타일 둘, 점수 0", () => {
  const s = createGame(seeded(1));
  assert.equal(s.board.filter(v => v).length, 2);
  assert.equal(s.score, 0);
  assert.equal(s.over, false);
});

test("끝 판정: 빈칸도 옆 같은 수도 없으면 끝", () => {
  // 체스판 무늬는 가로 이웃이 같으면 세로 이웃도 같아져 한쪽 검사가 빠져도 못 잡는다 — 줄마다 다른 판을 쓴다
  const stuck = [
    [2, 4, 8, 16],
    [16, 8, 4, 2],
    [2, 4, 8, 16],
    [16, 8, 4, 2],
  ].flat();
  assert.equal(canMove(stuck), false, "3 번(16)과 4 번(16)은 줄이 달라 이웃이 아니다");

  const sideBySide = stuck.slice();
  sideBySide[1] = 2; // 0 번과 가로로만 같다(아래 5 번은 8)
  assert.equal(canMove(sideBySide), true, "가로 이웃");

  const above = stuck.slice();
  above[4] = 2; // 0 번과 세로로만 같다(옆 5 번은 8)
  assert.equal(canMove(above), true, "세로 이웃");

  // 마지막 수로 판이 막히면 over
  const s = stateOf([
    [0, 2, 4, 2],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  const r = move(s, "right", noRand); // 첫 줄은 이미 오른쪽에 붙어 있다 → 움직임 없음
  assert.equal(r.moved, false);
  const r2 = move(s, "left", () => 0.95); // [2,4,2,0] → 빈칸에 4 → [2,4,2,4]
  assert.equal(r2.moved, true);
  assert.equal(s.over, true);
  assert.equal(move(s, "up", noRand).moved, false, "끝난 뒤엔 안 움직인다");
});

test("점수는 합쳐져 생긴 수만큼 오른다", () => {
  const s = stateOf([
    [2, 2, 4, 4],
    [16, 16, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  move(s, "left", () => 0);
  assert.equal(s.score, 4 + 8 + 32);
  move(s, "left", () => 0); // [4,8,2,0]·[32,0,0,0] — 안 움직인다, 점수 그대로
  assert.equal(s.score, 44);
});

test("2048 에 닿으면 멈추고, 계속하기 뒤엔 다시 움직인다", () => {
  const s = stateOf([
    [1024, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  move(s, "left", () => 0.5);
  assert.equal(s.board[0], WIN);
  assert.equal(s.won, true);
  assert.equal(paused(s), true);
  assert.equal(move(s, "right", noRand).moved, false, "계속하기 전엔 멈춤");
  keepGoing(s);
  assert.equal(paused(s), false);
  assert.equal(move(s, "right", () => 0).moved, true);
  assert.equal(s.won, true, "한 번 닿으면 계속 won");
});

test("2048 직전엔 won 이 아니다", () => {
  const s = stateOf([
    [512, 512, 1024, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  move(s, "left", () => 0.5);
  assert.deepEqual(s.board.slice(0, 2), [1024, 1024], "한 번만 합쳐진다");
  assert.equal(s.won, false);
});

test("되돌리기는 판마다 한 번", () => {
  const start = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 4],
  ];
  const s = stateOf(start);
  assert.equal(undo(s), false, "움직이기 전엔 못 한다");
  move(s, "left", () => 0);
  assert.equal(s.score, 4);
  assert.equal(undo(s), true);
  assert.deepEqual(rowsOf(s.board), start);
  assert.equal(s.score, 0);
  move(s, "left", () => 0);
  assert.equal(undo(s), false, "두 번째는 안 된다");
});

// 아무렇게나 오래 둬도 깨지지 않는 성질
test("씨앗 판 여러 개: 타일 합 = 나온 타일 합, 점수 = 합친 수 합, 끝나면 정말 막혔다", () => {
  const dirs: Dir[] = ["left", "up", "right", "down"];
  for (let seed = 1; seed <= 20; seed++) {
    const rand = seeded(seed);
    const s = createGame(rand);
    let spawnedSum = s.board.reduce((a, b) => a + b, 0);
    let gainedSum = 0;
    for (let n = 0; n < 3000 && !s.over; n++) {
      const before = s.board.slice();
      const r = move(s, dirs[Math.floor(rand() * 4)], rand);
      if (paused(s)) keepGoing(s);
      if (!r.moved) {
        assert.deepEqual(s.board, before, "안 움직였으면 판 그대로");
        continue;
      }
      assert.notEqual(r.spawned, null, "움직였으면 새 타일");
      spawnedSum += s.board[r.spawned!];
      gainedSum += r.gained;
      assert.equal(s.board.reduce((a, b) => a + b, 0), spawnedSum, `씨앗 ${seed}: 합 보존`);
      assert.equal(s.score, gainedSum);
      assert.ok(s.board.every(v => v === 0 || (v >= 2 && (v & (v - 1)) === 0)), "2 의 거듭제곱만");
    }
    assert.equal(s.over, true, `씨앗 ${seed}: 3000 수 안에 끝나야 한다`);
    for (const d of dirs) assert.equal(move(stateOf(rowsOf(s.board)), d, noRand).moved, false, "끝난 판은 어느 쪽도 안 움직인다");
  }
});
