// 실행: node --test tests/lab/font-coverage.test.ts
// /lab 소스의 한글 음절이 서브셋 픽셀 글꼴(LabPixel Regular·Bold)에 전부 있는지 본다.
// 2,350자(KS X 1001) 밖 음절(예: 똠·햏)이 문구에 들어오면 그 글자만 대체 글꼴로 튀므로 실패시킨다.
// 글꼴은 public/fonts/lab/*.woff2 를 직접 읽는다 — 외부 패키지 없이 node:zlib 의 brotli 로 푼다.
// 글꼴을 다시 뽑는 법: scripts/lab-font-subset.mjs 머리 주석.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FONT_DIR = join(ROOT, "public/fonts/lab");

// ---------- WOFF2 → 테이블 (cmap·name 만 필요. 둘 다 변환 없이 저장된다) ----------
function readBase128(buf: Buffer, pos: { p: number }): number {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.p++];
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return v;
  }
  throw new Error("UIntBase128 이 5바이트를 넘음");
}
const TAG_CMAP = 0, TAG_NAME = 5, TAG_GLYF = 10, TAG_LOCA = 11;

function woff2Tables(file: string): Map<number | string, Buffer> {
  const buf = readFileSync(file);
  assert.equal(buf.toString("latin1", 0, 4), "wOF2", `${file} 는 woff2 가 아님`);
  const numTables = buf.readUInt16BE(12);
  const pos = { p: 48 };
  const dir: { key: number | string; len: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos.p++];
    const idx = flags & 0x3f;
    let key: number | string = idx;
    if (idx === 0x3f) { key = buf.toString("latin1", pos.p, pos.p + 4); pos.p += 4; }
    const orig = readBase128(buf, pos);
    const ver = flags >> 6;
    const transformed = idx === TAG_GLYF || idx === TAG_LOCA ? ver === 0 : ver !== 0;
    const len = transformed ? readBase128(buf, pos) : orig;
    dir.push({ key, len });
  }
  const data = brotliDecompressSync(buf.subarray(pos.p));
  const out = new Map<number | string, Buffer>();
  let off = 0;
  for (const t of dir) { out.set(t.key, data.subarray(off, off + t.len)); off += t.len; }
  return out;
}

function cmapCodepoints(cmap: Buffer): Set<number> {
  const set = new Set<number>();
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const off = cmap.readUInt32BE(4 + i * 8 + 4);
    const fmt = cmap.readUInt16BE(off);
    if (fmt === 4) {
      const segX2 = cmap.readUInt16BE(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ros = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ros + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g: number;
          if (ro === 0) g = (c + delta) & 0xffff;
          else {
            g = cmap.readUInt16BE(ros + s * 2 + ro + (c - start) * 2);
            if (g) g = (g + delta) & 0xffff;
          }
          if (g) set.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = cmap.readUInt32BE(off + 12);
      for (let g = 0; g < groups; g++) {
        const b = off + 16 + g * 12;
        const s = cmap.readUInt32BE(b), e = cmap.readUInt32BE(b + 4), g0 = cmap.readUInt32BE(b + 8);
        for (let c = s; c <= e; c++) if (g0 + (c - s)) set.add(c);
      }
    }
  }
  return set;
}

function fontCmap(name: string): Set<number> {
  const cmap = woff2Tables(join(FONT_DIR, name)).get(TAG_CMAP);
  assert.ok(cmap, `${name} 에 cmap 이 없음`);
  return cmapCodepoints(cmap);
}

// ---------- /lab 소스 ----------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const labFiles = [...walk(join(ROOT, "src/lab")), ...walk(join(ROOT, "src/pages/lab"))];
const isSyllable = (cp: number) => cp >= 0xac00 && cp <= 0xd7a3;

// 글자 → 처음 나온 파일:줄
function labSyllables(): Map<string, string> {
  const seen = new Map<string, string>();
  for (const f of labFiles) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      for (const ch of line)
        if (isSyllable(ch.codePointAt(0)!) && !seen.has(ch)) seen.set(ch, `${relative(ROOT, f)}:${i + 1}`);
    });
  }
  return seen;
}

function ksx1001Hangul(): string[] {
  const dec = new TextDecoder("euc-kr");
  const out: string[] = [];
  for (let hi = 0xb0; hi <= 0xc8; hi++)
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = dec.decode(new Uint8Array([hi, lo]));
      if (isSyllable(ch.codePointAt(0)!)) out.push(ch);
    }
  return out;
}

// ---------- 검사 ----------
const syllables = labSyllables();

test("/lab 소스에 한글 음절이 있다(빈 집합이면 아래 검사가 저절로 통과하므로 막는다)", () => {
  assert.ok(syllables.size > 100, `한글 음절 ${syllables.size}자 — 소스를 못 읽은 것 아닌가`);
});

for (const font of ["LabPixel-Regular.woff2", "LabPixel-Bold.woff2"]) {
  test(`${font}: /lab 소스의 한글 음절 ⊆ cmap`, () => {
    const cmap = fontCmap(font);
    const missing = [...syllables].filter(([ch]) => !cmap.has(ch.codePointAt(0)!));
    assert.equal(
      missing.length, 0,
      `${font} 에 없는 음절 ${missing.length}자 (대체 글꼴로 튄다 — 문구를 바꾸거나 서브셋에 추가):\n` +
        missing.map(([ch, at]) => `  ${ch} U+${ch.codePointAt(0)!.toString(16).toUpperCase()}  ${at}`).join("\n"),
    );
  });

  test(`${font}: KS X 1001 한글 2,350자와 ASCII 를 담고 있다`, () => {
    const cmap = fontCmap(font);
    const ks = ksx1001Hangul();
    assert.equal(ks.length, 2350);
    const lostKs = ks.filter(ch => !cmap.has(ch.codePointAt(0)!));
    assert.equal(lostKs.length, 0, `KS X 1001 누락: ${lostKs.join("")}`);
    for (let c = 0x20; c <= 0x7e; c++) assert.ok(cmap.has(c), `ASCII U+${c.toString(16)} 누락`);
  });
}

test("LabPixelMono-Regular.woff2: ASCII(0x20–0x7E) 를 담고 있다", () => {
  const cmap = fontCmap("LabPixelMono-Regular.woff2");
  for (let c = 0x20; c <= 0x7e; c++) assert.ok(cmap.has(c), `ASCII U+${c.toString(16)} 누락`);
});

test("name 테이블에 예약 이름 Galmuri 가 없다(OFL Reserved Font Name)", () => {
  for (const font of ["LabPixel-Regular.woff2", "LabPixel-Bold.woff2", "LabPixelMono-Regular.woff2"]) {
    const name = woff2Tables(join(FONT_DIR, font)).get(TAG_NAME);
    assert.ok(name, `${font} 에 name 이 없음`);
    const asUtf16 = Buffer.from(name).swap16().toString("utf16le");
    const asLatin = name.toString("latin1");
    assert.ok(!/galmuri/i.test(asUtf16) && !/galmuri/i.test(asLatin), `${font} name 테이블에 Galmuri 가 남음`);
    assert.ok(/LabPixel/.test(asUtf16) || /LabPixel/.test(asLatin), `${font} name 테이블에 LabPixel 이 없음(파서 고장?)`);
  }
});
