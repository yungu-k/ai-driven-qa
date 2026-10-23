// 실행: node --test tests/lab/ui-bug-hunt.test.ts   (Node 22.18+ 는 .ts 를 그대로 돌린다)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  tap,
  hint,
  skip,
  nextLevel,
  levelResult,
  summary,
  rankFor,
  formatTime,
  bugAt,
  makeVariant,
  renderSpec,
  renderBuild,
  type Level,
  type Tappable,
} from "../../src/lab/ui-bug-hunt/engine.ts";
import { LEVELS, cartTotal } from "../../src/lab/ui-bug-hunt/levels.ts";

// ── 렌더 결과를 가짜 DOM 나무로 ──────────────────────────────
// 판정은 element.closest() 로 하므로, 같은 일을 하는 작은 나무를 만든다.
// 지원하는 선택자는 엔진이 쓰는 [data-bug="id"] 하나뿐 — 다른 꼴이 오면 바로 터지게 한다.
type Node = Tappable & { tag: string; attrs: string; parent: Node | null; text: string };

function parse(html: string): Node[] {
  const root: Node = mk("#root", "", null);
  const all: Node[] = [];
  let cur = root;
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  for (const m of html.matchAll(re)) {
    if (m[4] !== undefined) {
      cur.text += m[4].trim();
      continue;
    }
    if (m[1]) {
      assert.equal(cur.tag, m[2], `닫는 태그가 안 맞음: </${m[2]}> (열린 것 ${cur.tag})`);
      cur = cur.parent!;
    } else {
      const n = mk(m[2], m[3], cur);
      all.push(n);
      cur = n;
    }
  }
  assert.equal(cur, root, "안 닫힌 태그가 있다");
  return all;

  function mk(tag: string, attrs: string, parent: Node | null): Node {
    const n: Node = {
      tag,
      attrs,
      parent,
      text: "",
      closest(sel: string) {
        const want = /^\[data-bug="([^"]+)"\]$/.exec(sel);
        assert.ok(want, `가짜 DOM 이 모르는 선택자: ${sel}`);
        for (let x: Node | null = n; x; x = x.parent)
          if (x.attrs.includes(`data-bug="${want[1]}"`)) return x;
        return null;
      },
    };
    return n;
  }
}

/** 이 요소를 누르면 맞아야 하는 버그 = 자기나 조상의 data-bug */
function expectedBug(n: Node): string | null {
  for (let x: Node | null = n; x; x = x.parent) {
    const m = /data-bug="([^"]+)"/.exec(x.attrs);
    if (m) return m[1];
  }
  return null;
}

const dataBugIds = (html: string) => [...html.matchAll(/data-bug="([^"]+)"/g)].map(m => m[1]);

// 세 버그짜리 시험용 단계(화면은 안 쓴다)
const fakeLevel = (id: string, n = 3): Level => ({
  id,
  title: id,
  app: id,
  brief: "",
  bugs: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, change: "c", desc: `d${i}` })),
  render: () => "",
});

// ── 판정 규칙 ──────────────────────────────────────────────
test("버그 영역 안을 탭하면 찾음 — 영역 안 깊은 자식도 맞다", () => {
  const lv = LEVELS[0];
  const nodes = parse(renderBuild(lv));
  const inside = nodes.find(n => n.parent && expectedBug(n) === "cut")!;
  assert.ok(inside, "cut 영역이 렌더에 있다");
  const g = createGame(LEVELS, 0);
  const r = tap(g, bugAt(lv, inside), 100);
  assert.equal(r.kind, "found");
  assert.deepEqual(g.runs[0].found, ["cut"]);
  assert.equal(g.runs[0].misses, 0);
});

test("같은 버그를 두 번 탭해도 한 번만 센다(실수도 아니다)", () => {
  const g = createGame([fakeLevel("a")], 0);
  assert.equal(tap(g, "b0", 10).kind, "found");
  assert.equal(tap(g, "b0", 20).kind, "again");
  assert.equal(tap(g, "b0", 30).kind, "again");
  assert.deepEqual(g.runs[0].found, ["b0"]);
  assert.equal(g.runs[0].misses, 0);
});

test("빈 곳·모르는 id 를 탭하면 실수", () => {
  const g = createGame([fakeLevel("a")], 0);
  assert.equal(tap(g, null, 10).kind, "miss");
  assert.equal(tap(g, "없는버그", 20).kind, "miss");
  assert.equal(g.runs[0].misses, 2);
  assert.equal(g.runs[0].found.length, 0);
});

test("다 찾으면 단계가 끝나고, 끝난 뒤 탭은 무시된다", () => {
  const g = createGame([fakeLevel("a"), fakeLevel("b")], 1000);
  tap(g, "b0", 1100);
  tap(g, "b1", 1200);
  assert.equal(g.runs[0].endedAt, null);
  const last = tap(g, "b2", 1300);
  assert.equal(last.kind, "found");
  assert.equal(last.kind === "found" && last.cleared, true);
  assert.equal(g.runs[0].endedAt, 1300);
  assert.equal(tap(g, null, 1400).kind, "ignored");
  assert.equal(g.runs[0].misses, 0, "끝난 뒤 빈 곳 탭은 실수가 아니다");
  assert.equal(levelResult(g, 0, 99999).ms, 300, "끝난 단계의 시간은 멈춘다");
});

test("단계 넘김: 안 끝난 단계는 못 넘고, 마지막을 넘기면 끝", () => {
  const g = createGame([fakeLevel("a", 1), fakeLevel("b", 1)], 0);
  assert.equal(nextLevel(g, 5), false, "안 끝났으면 못 넘어간다");
  assert.equal(g.index, 0);
  tap(g, "b0", 10);
  assert.equal(nextLevel(g, 20), true);
  assert.equal(g.index, 1);
  assert.equal(g.runs[1].startedAt, 20, "새 단계 시계는 넘긴 순간부터");
  // 포기하고 넘기기
  const left = skip(g, 50);
  assert.deepEqual(left.map(b => b.id), ["b0"]);
  assert.equal(g.runs[1].skipped, true);
  assert.equal(nextLevel(g, 60), false);
  assert.equal(g.over, true);
  assert.equal(tap(g, "b0", 70).kind, "ignored");
});

test("힌트는 못 찾은 것만 가리키고 횟수를 센다", () => {
  const g = createGame([fakeLevel("a")], 0);
  tap(g, "b0", 1);
  assert.equal(hint(g)?.id, "b1");
  tap(g, "b1", 2);
  assert.equal(hint(g)?.id, "b2");
  assert.equal(g.runs[0].hints, 2);
  tap(g, "b2", 3);
  assert.equal(hint(g), null, "다 찾으면 힌트 없음");
  assert.equal(g.runs[0].hints, 2);
});

test("요약 수치: 실제 단계 넷을 돌린 합", () => {
  const g = createGame(LEVELS, 0);
  let t = 0;
  // 1단계: 실수 2, 다 찾음 / 2단계: 힌트 1, 다 찾음 / 3단계: 하나 찾고 넘김 / 4단계: 다 찾음
  tap(g, null, (t += 1000));
  tap(g, null, (t += 1000));
  for (const b of LEVELS[0].bugs) tap(g, b.id, (t += 1000)); // 0~6000
  nextLevel(g, (t += 500)); // 6500
  hint(g);
  for (const b of LEVELS[1].bugs) tap(g, b.id, (t += 1000)); // ~10500
  nextLevel(g, t);
  tap(g, LEVELS[2].bugs[0].id, (t += 2000));
  tap(g, LEVELS[2].bugs[0].id, (t += 100)); // 같은 버그 다시
  skip(g, (t += 900));
  nextLevel(g, t);
  for (const b of LEVELS[3].bugs) tap(g, b.id, (t += 500));
  nextLevel(g, t + 9999);
  assert.equal(g.over, true);

  const total = LEVELS.reduce((a, l) => a + l.bugs.length, 0);
  const s = summary(g, t + 99999);
  assert.equal(s.levels, 4);
  assert.equal(s.total, total);
  assert.equal(s.found, total - (LEVELS[2].bugs.length - 1));
  assert.equal(s.misses, 2);
  assert.equal(s.hints, 1);
  assert.equal(s.ms, 6000 + 4000 + 3000 + LEVELS[3].bugs.length * 500);
});

test("칭호 경계", () => {
  assert.equal(rankFor(0, 0, 0, 0), "견습 테스터");
  assert.equal(rankFor(16, 16, 0, 0), "픽셀 탐정");
  assert.equal(rankFor(16, 16, 0, 1), "QA Lead", "힌트를 쓰면 한 단계 아래");
  assert.equal(rankFor(16, 16, 17, 0), "QA Lead", "실수가 버그 수보다 많으면 한 단계 아래");
  assert.equal(rankFor(16, 16, 16, 0), "픽셀 탐정");
  assert.equal(rankFor(12, 16, 0, 0), "QA Lead");
  assert.equal(rankFor(8, 16, 0, 0), "시니어 QA");
  assert.equal(rankFor(1, 16, 0, 0), "주니어 QA");
  assert.equal(rankFor(0, 16, 99, 9), "견습 테스터", "바닥 아래로 안 간다");
});

test("시간 표기", () => {
  assert.equal(formatTime(0), "0초");
  assert.equal(formatTime(59_999), "59초");
  assert.equal(formatTime(65_000), "1분 05초");
  assert.equal(formatTime(-5), "0초");
});

// ── 단계 데이터 ────────────────────────────────────────────
test("단계 id 는 겹치지 않고, 단계는 4개", () => {
  assert.equal(LEVELS.length, 4);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, LEVELS.length);
});

for (const lv of LEVELS) {
  test(`[${lv.id}] 버그 3~4개, id 중복 없음, 설명·변형 비어 있지 않음`, () => {
    assert.ok(lv.bugs.length >= 3 && lv.bugs.length <= 4, `버그 ${lv.bugs.length}개`);
    const ids = lv.bugs.map(b => b.id);
    assert.equal(new Set(ids).size, ids.length, `중복 id: ${ids}`);
    for (const b of lv.bugs) {
      assert.ok(b.desc.trim().length > 0, `${b.id} 설명 빔`);
      assert.ok(b.change.trim().length > 0, `${b.id} 변형 메모 빔`);
    }
    assert.ok(lv.title && lv.app && lv.brief);
  });

  test(`[${lv.id}] 기획서엔 버그 표시가 없고 실제 빌드엔 버그마다 정확히 한 번`, () => {
    const spec = renderSpec(lv);
    const build = renderBuild(lv);
    assert.deepEqual(dataBugIds(spec), [], "기획서에 data-bug 가 있다");
    assert.ok(!spec.includes("ub-x-"), "기획서에 버그 변형 클래스가 남았다");
    const got = dataBugIds(build).sort();
    assert.deepEqual(got, lv.bugs.map(b => b.id).sort(), "빌드의 data-bug 가 버그 목록과 다르다");
  });

  test(`[${lv.id}] 버그 하나씩만 켜도 화면이 기획서와 달라진다(빈 변형 없음)`, () => {
    const spec = renderSpec(lv);
    for (const b of lv.bugs) {
      const one = lv.render(makeVariant([b.id], false));
      assert.notEqual(one, spec, `${b.id} 를 켜도 화면이 그대로다`);
      // 다른 버그를 다 켠 판에서 이것만 끄면 다시 달라져야 한다(두 버그가 같은 자리를 덮어쓰지 않음)
      const others = lv.bugs.filter(x => x.id !== b.id).map(x => x.id);
      assert.notEqual(
        lv.render(makeVariant(others, false)),
        lv.render(makeVariant([...others, b.id], false)),
        `${b.id} 변형이 다른 버그에 덮였다`
      );
    }
  });

  test(`[${lv.id}] 모든 요소에서 탭 판정이 자기 영역과 맞고, 영역 밖은 실수`, () => {
    const nodes = parse(renderBuild(lv));
    let outside = 0;
    for (const n of nodes) {
      const want = expectedBug(n);
      if (want === null) outside++;
      assert.equal(bugAt(lv, n), want, `<${n.tag}${n.attrs}> ${n.text}`);
    }
    assert.ok(outside > 0, "영역 밖 요소가 하나도 없다 — 화면 전체가 버그 영역?");
    // 기획서 화면 요소는 어디를 눌러도 버그가 아니다
    for (const n of parse(renderSpec(lv))) assert.equal(bugAt(lv, n), null);
  });
}

test("[cart] 기획서 합계는 줄 금액 합+배송비, 빌드 합계는 그와 다르다", () => {
  const lv = LEVELS.find(l => l.id === "cart")!;
  const want = `${cartTotal().toLocaleString("en-US")}원`;
  const totalOf = (html: string) =>
    /결제 금액<\/span><span>([^<]+)<\/span>/.exec(html)?.[1];
  assert.equal(totalOf(renderSpec(lv)), want);
  assert.notEqual(totalOf(renderBuild(lv)), want);
});

test("[booking] 기획서 요일이 실제 달력과 맞다", () => {
  const lv = LEVELS.find(l => l.id === "booking")!;
  const spec = renderSpec(lv);
  const wd = (d: number) => new Date(2026, 9, d).toLocaleDateString("ko-KR", { weekday: "short" });
  assert.ok(spec.includes(`10.24 (${wd(24)})`));
  assert.ok(spec.includes(`10.26 (${wd(26)})`));
  assert.ok(spec.includes("2박"));
});
