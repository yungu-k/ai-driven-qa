// 실행: node --test "tests/lab/*.test.ts"
// 개인 블로그다. 회사 이름이 실험실·이스터에그 문구에 들어가면 안 된다(10-27, 부팅 화면에 들어갔던 적이 있다).
// 금지 낱말은 이 파일 자체에 걸리지 않게 조각으로 적는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const BANNED = new RegExp(["clo", "nix"].join(""), "i");
const TARGETS = [
  "src/lab",
  "src/pages/lab",
  "src/scripts/lab-shatter.ts",
  "src/components/Header.astro",
];

function files(p: string): string[] {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [p];
  return readdirSync(abs).flatMap(n => files(join(p, n)));
}

test("실험실·이스터에그 문구에 회사 이름이 없다", () => {
  const all = TARGETS.flatMap(files);
  assert.ok(all.length > 5, `검사할 파일이 너무 적다(${all.length}) — 경로가 바뀌었나`);
  const hits = all.flatMap(f =>
    readFileSync(join(ROOT, f), "utf8")
      .split("\n")
      .flatMap((line, i) => (BANNED.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : []))
  );
  assert.deepEqual(hits, []);
});
