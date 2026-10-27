#!/usr/bin/env node
// /lab 픽셀 글꼴 서브셋 생성기 — Galmuri(OFL-1.1) → LabPixel / LabPixelMono
//
// 무엇을 만드나 (docs/lab-arcade-spec.md A2 기본안)
//   public/fonts/lab/LabPixel-Regular.woff2   ← Galmuri11.ttf
//   public/fonts/lab/LabPixel-Bold.woff2      ← Galmuri11-Bold.ttf
//   public/fonts/lab/LabPixelMono-Regular.woff2 ← GalmuriMono11.ttf (ASCII 만)
//   글자: KS X 1001 한글 2,350자 + ASCII(0x20–0x7E) + 규격 기호
//         + /lab 소스(src/lab/**, src/pages/lab/**)에 쓰인 비한글 문자 중 원본에 있는 것.
//   OFL Reserved Font Name 때문에 name 테이블의 Galmuri 이름(ID 1·3·4·6·16·17 등)을
//   LabPixel / LabPixelMono 로 바꾼다. 저작권(ID 0)·라이선스(ID 13·14)는 그대로 둔다.
//   만든 뒤 woff2 를 다시 풀어 cmap 을 읽고, 요청한 글자가 전부 들어갔는지 확인한다.
//   (tests/lab/font-coverage.test.ts 는 그 woff2 를 직접 읽어 소스 한글 ⊆ cmap 을 본다.)
//
// 실행 방법 (저장소 의존성을 늘리지 않으려고 도구는 임시 폴더에 둔다)
//   1) 원본:  mkdir /tmp/galmuri && cd /tmp/galmuri && npm pack galmuri@2.40.3 && tar xzf galmuri-2.40.3.tgz
//   2) 도구:  mkdir /tmp/fonttools && cd /tmp/fonttools && npm init -y && npm i subset-font@2.9.0 wawoff2@2.0.1
//   3) 저장소 루트에서:
//      LAB_FONT_TOOLS=/tmp/fonttools node scripts/lab-font-subset.mjs /tmp/galmuri/package/dist
//   LICENSE.txt 는 이 스크립트가 쓰지 않는다(원본 package/ofl.md 전문 + 파생본 설명, 손으로 관리).

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2];
const TOOLS = process.env.LAB_FONT_TOOLS;
if (!SRC || !TOOLS) {
  console.error("사용법: LAB_FONT_TOOLS=<subset-font·wawoff2 설치 폴더> node scripts/lab-font-subset.mjs <galmuri dist 폴더>");
  process.exit(2);
}
const req = createRequire(join(resolve(TOOLS), "package.json"));
const subsetFont = req("subset-font");
const wawoff2 = req("wawoff2");

const OUT = join(ROOT, "public/fonts/lab");
mkdirSync(OUT, { recursive: true });

// ---------- 글자 집합 ----------
function ksx1001Hangul() {
  // EUC-KR 0xB0A1–0xC8FE 가 KS X 1001 완성형 한글 2,350자
  const dec = new TextDecoder("euc-kr");
  const out = [];
  for (let hi = 0xb0; hi <= 0xc8; hi++)
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = dec.decode(new Uint8Array([hi, lo]));
      const cp = ch.codePointAt(0);
      if (cp >= 0xac00 && cp <= 0xd7a3) out.push(ch);
    }
  if (out.length !== 2350) throw new Error(`KS X 1001 한글 수가 2350 이 아님: ${out.length}`);
  return out;
}
const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCodePoint(0x20 + i));
// 규격(A2·디자인 문서)에 나온 기호
const SPEC_SYMBOLS = [..."▶◀▲▼★☆♥♡←→↑↓「」『』…·×—–‘’“”~○●□■◆◇♪"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const labFiles = [...walk(join(ROOT, "src/lab")), ...walk(join(ROOT, "src/pages/lab"))];
const labText = labFiles.map(f => readFileSync(f, "utf8")).join("\n");
const isHangulSyllable = cp => cp >= 0xac00 && cp <= 0xd7a3;
const labExtra = [...new Set([...labText].filter(c => {
  const cp = c.codePointAt(0);
  return cp > 0x7e && !isHangulSyllable(cp);
}))];
const labHangul = [...new Set([...labText].filter(c => isHangulSyllable(c.codePointAt(0))))];

// ---------- sfnt 도구 ----------
function readTables(buf) {
  const n = buf.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    const tag = buf.toString("latin1", o, o + 4);
    const off = buf.readUInt32BE(o + 8);
    const len = buf.readUInt32BE(o + 12);
    tables.set(tag, buf.subarray(off, off + len));
  }
  return { flavor: buf.readUInt32BE(0), tables };
}
function cmapOf(buf) {
  const cmap = readTables(buf).tables.get("cmap");
  const set = new Set();
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
          let g;
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
      for (let gI = 0; gI < groups; gI++) {
        const b = off + 16 + gI * 12;
        const s = cmap.readUInt32BE(b), e = cmap.readUInt32BE(b + 4), g0 = cmap.readUInt32BE(b + 8);
        for (let c = s; c <= e; c++) if (g0 + (c - s)) set.add(c);
      }
    }
  }
  return set;
}
function checksum(b) {
  const p = Buffer.alloc((b.length + 3) & ~3);
  b.copy(p);
  let s = 0;
  for (let i = 0; i < p.length; i += 4) s = (s + p.readUInt32BE(i)) >>> 0;
  return s;
}
function buildSfnt(flavor, tables) {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  let es = 0;
  while (1 << (es + 1) <= n) es++;
  const head = Buffer.alloc(12 + n * 16);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(n, 4);
  head.writeUInt16BE((1 << es) * 16, 6);
  head.writeUInt16BE(es, 8);
  head.writeUInt16BE(n * 16 - (1 << es) * 16, 10);
  const parts = [head];
  let off = head.length;
  tags.forEach((tag, i) => {
    let data = Buffer.from(tables.get(tag));
    if (tag === "head") data.writeUInt32BE(0, 8);
    const o = 12 + i * 16;
    head.write(tag, o, "latin1");
    head.writeUInt32BE(checksum(data), o + 4);
    head.writeUInt32BE(off, o + 8);
    head.writeUInt32BE(data.length, o + 12);
    const pad = Buffer.alloc((data.length + 3) & ~3);
    data.copy(pad);
    parts.push(pad);
    tables.set(tag, data);
    off += pad.length;
  });
  const out = Buffer.concat(parts);
  const headOff = head.readUInt32BE(12 + tags.indexOf("head") * 16 + 8);
  out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headOff + 8);
  return out;
}
// name 테이블에서 Galmuri 이름을 바꾼다
const RENAME_IDS = new Set([1, 2, 3, 4, 6, 16, 17, 18, 21, 22, 25]);
function renameFont(buf, family, style) {
  const { flavor, tables } = readTables(buf);
  const name = tables.get("name");
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4);
  const recs = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 12;
    const r = {
      pid: name.readUInt16BE(o), eid: name.readUInt16BE(o + 2), lid: name.readUInt16BE(o + 4),
      nid: name.readUInt16BE(o + 6),
    };
    const len = name.readUInt16BE(o + 8), off = name.readUInt16BE(o + 10);
    r.raw = Buffer.from(name.subarray(strOff + off, strOff + off + len));
    recs.push(r);
  }
  const utf16 = r => r.pid === 0 || r.pid === 3;
  const decode = r => utf16(r) ? Buffer.from(r.raw).swap16().toString("utf16le") : r.raw.toString("latin1");
  const encode = (r, s) => utf16(r) ? Buffer.from(s, "utf16le").swap16() : Buffer.from(s, "latin1");
  const ps = `${family}-${style}`;
  // ID 3(고유 ID)에도 예약 이름을 남기지 않는다
  const want = { 1: family, 2: style, 3: `${ps};subset`, 4: `${family} ${style}`, 6: ps, 16: family, 17: style };
  const changed = [];
  for (const r of recs) {
    if (!RENAME_IDS.has(r.nid)) continue;
    const before = decode(r);
    const after = want[r.nid] ?? before.replace(/Galmuri(Mono)?\d*/g, family);
    if (after !== before) { r.raw = encode(r, after); changed.push(`${r.nid}:${before}→${after}`); }
  }
  recs.sort((a, b) => a.pid - b.pid || a.eid - b.eid || a.lid - b.lid || a.nid - b.nid);
  const hdr = Buffer.alloc(6 + recs.length * 12);
  hdr.writeUInt16BE(0, 0);
  hdr.writeUInt16BE(recs.length, 2);
  hdr.writeUInt16BE(hdr.length, 4);
  let so = 0;
  recs.forEach((r, i) => {
    const o = 6 + i * 12;
    hdr.writeUInt16BE(r.pid, o); hdr.writeUInt16BE(r.eid, o + 2); hdr.writeUInt16BE(r.lid, o + 4);
    hdr.writeUInt16BE(r.nid, o + 6); hdr.writeUInt16BE(r.raw.length, o + 8); hdr.writeUInt16BE(so, o + 10);
    so += r.raw.length;
  });
  tables.set("name", Buffer.concat([hdr, ...recs.map(r => r.raw)]));
  // 남은 Galmuri 문자열(ID 0 저작권·13/14 라이선스 외)이 있으면 실패
  for (const r of recs) {
    if (r.nid === 0 || r.nid === 13 || r.nid === 14) continue;
    if (/galmuri/i.test(decode(r))) throw new Error(`name ID ${r.nid} 에 예약 이름이 남음: ${decode(r)}`);
  }
  return { buf: buildSfnt(flavor, tables), changed };
}

// ---------- 실행 ----------
const hangul = ksx1001Hangul();
const jobs = [
  { src: "Galmuri11.ttf", out: "LabPixel-Regular.woff2", family: "LabPixel", style: "Regular", full: true },
  { src: "Galmuri11-Bold.ttf", out: "LabPixel-Bold.woff2", family: "LabPixel", style: "Bold", full: true },
  { src: "GalmuriMono11.ttf", out: "LabPixelMono-Regular.woff2", family: "LabPixelMono", style: "Regular", full: false },
];
let failed = false;
for (const j of jobs) {
  const orig = readFileSync(join(SRC, j.src));
  const origCmap = cmapOf(orig);
  const wanted = j.full ? [...new Set([...hangul, ...ASCII, ...SPEC_SYMBOLS, ...labExtra])] : ASCII;
  const present = wanted.filter(c => origCmap.has(c.codePointAt(0)));
  const absent = wanted.filter(c => !origCmap.has(c.codePointAt(0)));
  const ttf = await subsetFont(orig, present.join(""), { targetFormat: "truetype" });
  const { buf, changed } = renameFont(Buffer.from(ttf), j.family, j.style);
  const woff2 = Buffer.from(await wawoff2.compress(buf));
  writeFileSync(join(OUT, j.out), woff2);
  // 검증: woff2 를 다시 풀어 cmap 확인
  const back = Buffer.from(await wawoff2.decompress(woff2));
  const outCmap = cmapOf(back);
  const lost = present.filter(c => !outCmap.has(c.codePointAt(0)));
  const labMissing = j.full ? labHangul.filter(c => !outCmap.has(c.codePointAt(0))) : [];
  console.log(`${j.out}: ${woff2.length} B, cmap ${outCmap.size}자 (요청 ${wanted.length}, 원본에 없음 ${absent.length}: ${absent.map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ")})`);
  console.log(`  name 개명: ${changed.join(" | ")}`);
  if (lost.length) { failed = true; console.error(`  서브셋에서 빠짐: ${lost.join("")}`); }
  if (labMissing.length) { failed = true; console.error(`  /lab 소스 한글 누락: ${labMissing.join("")}`); }
}
process.exit(failed ? 1 : 0);
