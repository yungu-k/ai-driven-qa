// 실행: node --test "tests/lab/*.test.ts"
// 2048 픽셀 얼굴(16×16 글자 격자 → rect) 검사. 크기·글자·rect 만·표정 겹침 없음·되그리기 일치.
// 서브에이전트가 만든 일회용 검사를 저장소로 옮긴 것(10-27) — 결함 2개를 넣어 빨강 나는 것 확인됨.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FACES, faceFor, gridToRects } from "../../src/lab/merge-2048/faces.ts";

test("2048 픽셀 얼굴 격자가 온전하다", () => {
  let bad = 0;
  const seen = new Set<string>();
  for (const [v, rows] of Object.entries(FACES)) {
    if (rows.length !== 16 || rows.some(r => r.length !== 16)) { console.log("크기 틀림", v, rows.map(r=>r.length)); bad++; }
    const unknown = rows.join("").replace(/[.#pwrbyo]/g, "");
    if (unknown) { console.log("모르는 글자", v, unknown); bad++; }
    const svg = faceFor(Number(v));
    if (/<(?!\/?(svg|rect)\b)/.test(svg)) { console.log("rect 아닌 요소", v); bad++; }
    if (seen.has(svg)) { console.log("표정 겹침", v); bad++; }
    seen.add(svg);
    // 되그리기: rect 를 다시 격자로 칠해 원본과 같은지
    const g = Array.from({ length: 16 }, () => Array(16).fill("."));
    for (const m of svg.matchAll(/x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="([^"]+)"/g)) for (let i = 0; i < +m[3]; i++) g[+m[2]][+m[1] + i] = m[4] === "#1c1c21" ? "#" : "*";
    const back = g.map(r => r.join("")).join("\n");
    const want = rows.map(r => r.replace(/[^.#]/g, "*")).join("\n");
    if (back !== want) { console.log("되그리기 다름", v); bad++; }
  }
  if (faceFor(4096) !== faceFor(2048)) { console.log("2048 넘는 값이 2048 얼굴이 아님"); bad++; }
  if (gridToRects(["##..#"]) !== '<rect x="0" y="0" width="2" height="1" fill="#1c1c21"/><rect x="4" y="0" width="1" height="1" fill="#1c1c21"/>') { console.log("묶기 틀림"); bad++; }
  console.log("faces", Object.keys(FACES).length, "bad", bad, "bytes", Object.keys(FACES).reduce((a, v) => a + faceFor(+v).length, 0));
  assert.equal(bad, 0, "위 console 줄이 무엇이 틀렸는지 적는다");
});
