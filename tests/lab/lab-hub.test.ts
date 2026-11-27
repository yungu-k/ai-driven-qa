// 실행: node --test "tests/lab/*.test.ts"
// 실험실 갤러리 목록(src/lab/pixel/arts.ts) ↔ 작품 페이지 ↔ 작품 모듈 ↔ 썸네일이 서로 어긋나지 않는지(docs/lab-pixel-brief.md).
// 2026-11-27 Dean: 게임을 전부 없애고 도트 아트 갤러리로. 게임이 다시 끼어들면(페이지만 남은 옛 주소) 여기서 빨강.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ARTS, thumbOf } from "../../src/lab/pixel/arts.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const PAGES = join(ROOT, "src", "pages", "lab");

test("작품 이름(slug)이 겹치지 않고, 명판 글자에 자리표시가 없다", () => {
  assert.ok(ARTS.length >= 2, "작품이 둘보다 적다 — 목록이 비었나");
  assert.equal(new Set(ARTS.map(a => a.slug)).size, ARTS.length);
  for (const a of ARTS) {
    assert.match(a.slug, /^[a-z][a-z0-9-]*$/, a.slug);
    assert.ok(a.title.length > 0 && a.caption.length > 5, a.slug);
    for (const t of [a.title, a.caption]) assert.ok(!/PLACEHOLDER|TODO|lorem/i.test(t), `${a.slug}: ${t}`);
  }
});

// 썸네일 상한 100 KB: design ③ 640×480 webp 가 82·66 KB(불꽃 번짐까지 찍혀 칸 단위로 줄이면 화질이 깎인다). 늘어나는 걸 막는 줄
const THUMB_MAX = 100 * 1024;

test("작품마다 페이지·mount 모듈(.ts 또는 .js)·썸네일(100 KB 이하)이 있다", () => {
  for (const a of ARTS) {
    assert.ok(existsSync(join(PAGES, `${a.slug}.astro`)), `페이지 없음 src/pages/lab/${a.slug}.astro`);
    const mod = [".ts", ".js"].map(e => join(ROOT, "src", "lab", "pixel", `${a.slug}${e}`)).find(existsSync);
    assert.ok(mod, `모듈 없음 src/lab/pixel/${a.slug}.ts|.js`);
    const src = readFileSync(mod, "utf8");
    assert.match(src, /export function mount\(/, `${a.slug}: mount 계약`);
    // 작품이 스스로 밝힌 첫 페인트 색이 있으면 목록 값과 같아야 이음새가 안 보인다(design ② 「옮길 때 1」)
    const own = src.match(/export const paint = "(#[0-9a-f]{6})"/i)?.[1];
    if (own) assert.equal(a.paint?.toLowerCase(), own.toLowerCase(), `${a.slug} paint`);
    const thumb = join(ROOT, "public", thumbOf(a.slug));
    assert.ok(existsSync(thumb), `썸네일 없음 public${thumbOf(a.slug)}`);
    assert.ok(statSync(thumb).size <= THUMB_MAX, `${a.slug} 썸네일 ${statSync(thumb).size} B`);
  }
});

test("design 시안을 옮긴 .js 작품은 시안과 글자까지 같다", () => {
  for (const a of ARTS) {
    const js = join(ROOT, "src", "lab", "pixel", `${a.slug}.js`);
    const mock = join(ROOT, "docs", `lab-pixel-${a.slug}.js`);
    if (!existsSync(js) || !existsSync(mock)) continue; // docs 는 저장소 밖(미추적) — 없는 판에선 못 잰다
    assert.equal(readFileSync(js, "utf8"), readFileSync(mock, "utf8"), `${a.slug}.js ≠ docs/lab-pixel-${a.slug}.js`);
  }
});

test("실험실 페이지는 갤러리(index)와 작품 페이지뿐이다 — 옛 게임 페이지가 남지 않는다", () => {
  const want = new Set(["index.astro", ...ARTS.map(a => `${a.slug}.astro`)]);
  const extra = readdirSync(PAGES).filter(f => !want.has(f));
  assert.deepEqual(extra, []);
});

test("썸네일 폴더엔 목록의 작품 것만 있다", () => {
  const dir = join(ROOT, "public", "lab", "pixel");
  if (!existsSync(dir)) return;
  const slugs = new Set(ARTS.map(a => a.slug));
  for (const f of readdirSync(dir)) assert.ok(slugs.has(f.replace(/\.webp$/, "")), `목록에 없는 썸네일 ${f}`);
});
