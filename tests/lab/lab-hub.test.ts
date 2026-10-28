// 실행: node --test "tests/lab/*.test.ts"
// 실험실 첫 화면(허브) 목록 ↔ 부팅 카드 ↔ 키 아트 파일이 서로 어긋나지 않는지(규격 docs/lab-hub-spec.md 3·5절).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { GAMES, GROUPS, PLAYABLE, ROWS, groupOf } from "../../src/lab/hub-games.ts";
import { LAB_GAME_COUNT, bootCardHtml } from "../../src/lab/boot-card.ts";

const KEYART = join(import.meta.dirname, "..", "..", "public", "lab", "keyart");
const PAGES = join(import.meta.dirname, "..", "..", "src", "pages", "lab");

test("부팅 카드의 게임 수 = 허브 목록에서 준비 중을 뺀 수", () => {
  assert.equal(LAB_GAME_COUNT, PLAYABLE.length);
  assert.match(bootCardHtml(), new RegExp(`게임 ${PLAYABLE.length}개를 꺼내는 중`));
});

test("게임 이름(slug)이 겹치지 않고, 놀 수 있는 게임엔 소개·조작 한 줄이 있고 자리표시 글자가 없다", () => {
  assert.equal(new Set(GAMES.map(g => g.slug)).size, GAMES.length);
  assert.ok(PLAYABLE.length > 0);
  for (const g of PLAYABLE) {
    assert.ok(g.blurb.length > 20, `${g.slug} blurb`);
    assert.ok(g.guide && g.guide.length > 10, `${g.slug} guide`);
    for (const t of [g.title, g.blurb, g.guide]) assert.ok(!/PLACEHOLDER|TODO/i.test(t), `${g.slug}: ${t}`); // 8763a2e 에서 자리표시 문구가 운영에 나갔다
  }
});

test("키 아트 파일은 모두 목록의 게임 것이고 한 장 60 KB 이하", () => {
  const files = readdirSync(KEYART).filter(f => f.endsWith(".webp"));
  assert.ok(files.length > 0, "키 아트가 한 장도 없다 — 경로가 바뀌었나");
  const slugs = new Set(GAMES.map(g => g.slug));
  for (const f of files) {
    assert.ok(slugs.has(f.replace(/\.webp$/, "")), `목록에 없는 키 아트 ${f}`);
    assert.ok(statSync(join(KEYART, f)).size <= 60 * 1024, `${f} ${statSync(join(KEYART, f)).size} B`);
  }
});

test("줄(오락실 → 내기 모음): 모든 게임이 있는 줄에 들고, 오락실이 맨 위·머리 없이, 내기 모음은 머리·한 줄이 있다", () => {
  const ids = GROUPS.map(g => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of GAMES) assert.ok(ids.includes(groupOf(g)), `${g.slug} 의 줄 ${groupOf(g)} 이 GROUPS 에 없다`);
  assert.equal(ROWS.reduce((n, r) => n + r.games.length, 0), GAMES.length, "줄에 안 든 게임이 있다");
  assert.equal(ROWS[0].id, "arcade");
  assert.equal(ROWS[0].title, undefined, "오락실 줄은 10-28 전처럼 머리 없이");
  const party = ROWS.find(r => r.id === "party");
  assert.ok(party && party.games.length > 0, "내기 모음 줄이 비었다");
  assert.equal(party.title, "내기 모음");
  assert.ok(party.lede && party.lede.length > 5);
});

test("내기 모음 카드: 인원 알약이 있고 모두의 랭킹은 없다(서버 저장 0) · 오락실 카드엔 인원 알약이 없다", () => {
  for (const g of GAMES) {
    if (groupOf(g) === "party") {
      assert.match(g.players ?? "", /^\d–\d명$|^\d명$/, `${g.slug} 인원 알약 「${g.players}」`);
      assert.ok(!g.rank && !g.lapRank, `${g.slug}: 내기 모음엔 랭킹 줄을 달지 않는다`);
    } else assert.equal(g.players, undefined, `${g.slug}: 오락실 카드에 인원 알약`);
  }
});

test("놀 수 있는 게임마다 페이지(src/pages/lab/<slug>.astro)가 있다 — 카드 링크가 404 로 가지 않는다", () => {
  for (const g of PLAYABLE) assert.ok(existsSync(join(PAGES, `${g.slug}.astro`)), `${g.slug}.astro 없음`);
});
