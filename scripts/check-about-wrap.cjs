// About 「AI 팀원 N인(…)」 줄바꿈 검사 — 좁은 창에서 역할 이름이 쪼개지는가
//
// 🔴 **글자마다 줄 위치를 잰다.** 「넘치나(가로 스크롤)」만 보면 안 나온다 —
// 2026-09-15 QA 실측에서 가로 스크롤은 전부 0 이었는데 390~430px 에서 「Technical /
// Writer」가, 360·375px 에서 줄머리 「·」가 났다. 넘침 없이 **읽힘이 깨진다.**
//
// 잰 것(폭마다):
//   W1 묶음이 안 쪼개진다 — 「N개 역할:」 과 역할 이름 하나하나의 글자가 한 줄에 있다
//   W2 줄머리 「·」 0     — 「·」 는 앞 역할과 같은 줄에 있다
//   W3 가로 넘침 0        — 문서·그 불릿 둘 다
//   W4 일찍 끊김 0        — 앞 줄 남은 폭에 들어가는 역할 묶음이 다음 줄로 내려오지 않는다
//      (묶음 사이 줄바꿈 자리가 없으면 넘침 없이 줄만 는다 — W1~W3 으로는 안 보인다)
//      묶음 폭 = 역할 + 뒤 「·」, 마지막은 뒤 「)」 까지 — 「)」 는 앞 글자와 못 떨어진다(QA 가 증명)
//   W5 구조 — 역할·「N개 역할:」 이 각각 nowrap 요소 안이고 「·」 는 앞 역할과 같은 요소 안
//
// 🔴 **폭은 표본이 아니라 연속으로 훑는다(320~700px, 1px) + 768 + 인쇄.**
// 첫 판은 320·360·375·390·430·768 여섯 폭만 쟀다 — `Technical Writer` 의 nowrap 을 떼도
// **440~485px 에서만 쪼개져** 여섯 폭 전부 초록이었다(QA 부수기). 보호 장치를 떼도 표본에서
// 우연히 안 깨지면 초록이다. ⇒ 연속으로 훑고, **구조(W5)도 같이 단언**한다.
//
// 🔴 **폰트를 못 불러오면 「못 쟀다」(2)다.** 폰트 요청을 막으면 390px 이 2줄→3줄로 바뀌는데
// 첫 판은 PASS 였다(QA) — 사람이 보는 글꼴이 아닌 걸 쟀다는 게 출력에 안 남았다.
//
// ⚠ `edge`(줄 오른쪽 끝)는 **불릿 본문 span 의 오른쪽**이다. `li.flex` 의 자식이라 블록화돼서
// li 내용 박스와 같은 값이다(QA 대조). li 가 flex 가 아니게 바뀌면 span 이 인라인이 되어
// `edge` 가 가장 긴 줄로 줄고 넘침이 항상 0 이 된다 — W3·W4 가 조용히 초록. ⇒ 인라인이면 2.
// ⚠ 인쇄 폭은 근사다(print 매체 + A4 본문 폭 680px) — 쪽수는 check-resume-pdf 가 잰다.
//
// 🔴 **글을 못 찾으면 통과가 아니라 「못 쟀다」다.** 0개의 집계는 전부 통과 방향이다.
//
// 자체 시험 `--self-test`: 실제 dist 를 DOM 에서 부숴(nowrap 떼기·「·」 옮기기·<wbr> 빼기·
// 폰트 막기) **각각 빨강/못 쟀다가 나는지** 본다. 부순 판이 통과하면 검사가 죽은 것 → 3.
//
// 실행 — check-resume-pdf 와 같다(Windows 쪽 node, 인자 분리):
//   cd /mnt/c/dev/tech-blog && NODE_PATH='C:\dev\ai-team-office\node_modules' \
//     WSLENV=NODE_PATH cmd.exe /c node scripts\check-about-wrap.cjs [--self-test]
//
// 종료 코드: **0 통과 · 1 위반 · 2 못 쟀다**(브라우저·dist·문구·폰트·레이아웃 전제) **· 3 검사 죽음**(자체 시험)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const SWEEP = [320, 700];   // 흔한 폰 폭 ~ 인쇄 근사 폭까지 1px
const EXTRA = [768];
const PRINT_W = 680;        // A4 210mm − 좌우 여백 15mm×2 = 180mm ≈ 680px

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".json": "application/json", ".xml": "application/xml" };

// check-resume-pdf.cjs 의 serve() 와 같은 것 — dist 를 그대로 서빙한다
function serve(root){
  return new Promise(res => {
    const srv = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { rep.writeHead(403).end(); return; }
      try { if (fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); }
      catch (e) { rep.writeHead(404).end(); return; }
      try {
        const b = fs.readFileSync(f);
        rep.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
        rep.end(b);
      } catch (e) { rep.writeHead(404).end(); }
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

const target = () => [...document.querySelectorAll(".about-bullets li")]
  .find(e => /AI 팀원\s*\d+인/.test(e.textContent || ""));

// 페이지 안에서 돈다 — 전제(폰트·블록화)를 확인하고 글자마다 줄·좌표·nowrap 요소를 돌려준다
async function measure(){
  await document.fonts.ready;
  const li = [...document.querySelectorAll(".about-bullets li")]
    .find(e => /AI 팀원\s*\d+인/.test(e.textContent || ""));
  if (!li) return { found: false };
  const body = li.children[li.children.length - 1];
  const cs = getComputedStyle(body);
  const failedFaces = [...document.fonts].filter(f => f.status === "error").map(f => f.family);
  const fontOk = document.fonts.check(`${cs.fontSize} ${cs.fontFamily}`, body.textContent);
  const ids = new Map();
  const chars = [];
  const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    // 가장 가까운 nowrap 조상 — 없으면 null
    let nw = null;
    for (let e = n.parentElement; e && e !== body.parentElement; e = e.parentElement) {
      const ws = getComputedStyle(e).whiteSpace;
      if (ws === "nowrap" || ws === "pre") { nw = e; break; }
    }
    if (nw && !ids.has(nw)) ids.set(nw, ids.size);
    for (let i = 0; i < n.data.length; i++) {
      const rg = document.createRange();
      rg.setStart(n, i); rg.setEnd(n, i + 1);
      const rc = [...rg.getClientRects()].find(r => r.width > 0);
      chars.push({ ch: n.data[i], top: rc ? rc.top : null, h: rc ? rc.height : 0,
                   left: rc ? rc.left : null, right: rc ? rc.right : null,
                   nw: nw ? ids.get(nw) : null });
    }
  }
  let line = 0, lastTop = null;
  for (const c of chars) {
    if (c.top === null) { c.line = null; continue; }
    if (lastTop !== null && c.top > lastTop + c.h * 0.5) line++;
    c.line = line; lastTop = c.top;
  }
  const de = document.documentElement;
  return { found: true, display: cs.display, fontOk, failedFaces,
           text: chars.map(c => c.ch).join(""), lines: chars.map(c => c.line),
           lefts: chars.map(c => c.left), rights: chars.map(c => c.right), nws: chars.map(c => c.nw),
           edge: body.getBoundingClientRect().right,
           docOverflow: de.scrollWidth - de.clientWidth, liOverflow: body.scrollWidth - body.clientWidth };
}

function judge(m){
  const re = /AI 팀원 (\d+)인\(((\d+)개 역할: )?(.+?)\) 설계/;
  const hit = re.exec(m.text);
  if (!hit) return null;
  const units = [];                       // [시작, 끝) — 한 줄에 있어야 하는 글자 구간
  let at = hit.index + hit[0].indexOf("(") + 1;
  if (hit[2]) { units.push([at, at + hit[2].trimEnd().length]); at += hit[2].length; }
  const dots = [], chunks = [];           // 역할 묶음 = 역할 + 뒤 「·」(마지막은 뒤 「)」) — 같이 움직인다
  const close = hit.index + hit[0].lastIndexOf(")");
  for (const role of hit[4].split("·")) {
    units.push([at, at + role.length]);
    chunks.push([at, at + role.length + 1]);
    at += role.length;
    if (at < close) { dots.push(at); at += 1; }
  }
  const vis = i => m.text[i].trim() && m.lines[i] !== null;
  const split = [], heads = [], loose = [];
  for (const [s, e] of units) {
    const ls = new Set(), nws = new Set();
    for (let i = s; i < e; i++) if (vis(i)) { ls.add(m.lines[i]); nws.add(m.nws[i]); }
    if (ls.size > 1) split.push(m.text.slice(s, e));
    // W5 — 묶음 하나 = nowrap 요소 하나
    if (nws.has(null) || nws.size !== 1) loose.push(m.text.slice(s, e));
  }
  for (const d of dots) {
    let p = d - 1;
    while (p >= 0 && !vis(p)) p--;
    if (p >= 0 && m.lines[d] !== null && m.lines[d] !== m.lines[p]) heads.push(m.text.slice(d, d + 12));
    if (p >= 0 && (m.nws[d] === null || m.nws[d] !== m.nws[p])) loose.push("·" + m.text.slice(d + 1, d + 12));
  }
  const early = [];
  const ext = (s, e) => {
    const L = [], R = [];
    for (let i = s; i < e; i++) if (vis(i)) { L.push(m.lefts[i]); R.push(m.rights[i]); }
    return L.length ? { left: Math.min(...L), right: Math.max(...R), line: m.lines[s] } : null;
  };
  for (let k = 1; k < chunks.length; k++) {
    const a = ext(...chunks[k - 1]), c = ext(...chunks[k]);
    if (!a || !c || c.line !== a.line + 1) continue;
    if (a.right + (c.right - c.left) <= m.edge - 1) early.push(m.text.slice(...chunks[k]));
  }
  const nLines = new Set(m.lines.slice(hit.index, hit.index + hit[0].length).filter(x => x !== null)).size;
  return { units: units.length, split, heads, early, loose, nLines,
           overflow: Math.max(m.docOverflow, m.liOverflow, 0),
           bad: split.length + heads.length + early.length + loose.length + (Math.max(m.docOverflow, m.liOverflow, 0) > 0 ? 1 : 0) };
}

// DOM 부수기 — 마크업을 바꾼 것과 같은 효과. 자체 시험에서만 쓴다
const MUTANTS = {
  "nowrap 떼기(Technical Writer)": () => {
    const s = [...target().querySelectorAll("span")].find(e => /^Technical Writer/.test(e.textContent));
    s.classList.remove("whitespace-nowrap"); s.style.whiteSpace = "normal";
  },
  "「·」를 뒤 묶음 머리로": () => {
    const ss = [...target().querySelectorAll("span.whitespace-nowrap")].filter(e => /·$/.test(e.textContent));
    for (const s of ss) {
      s.textContent = s.textContent.slice(0, -1);
      let nx = s.nextSibling;
      while (nx && nx.nodeType === 1 && nx.tagName === "WBR") nx = nx.nextSibling;
      if (nx && nx.nodeType === 1) nx.textContent = "·" + nx.textContent;
    }
  },
  "<wbr> 빼기": () => { target().querySelectorAll("wbr").forEach(e => e.remove()); },
};

async function sweep(b, base, { mutate = null, blockFonts = false, quiet = false } = {}){
  const log = s => { if (!quiet) console.log(s); };
  const page = await b.newPage({ viewport: { width: SWEEP[0], height: 900 } });
  if (blockFonts) await page.route(/\.(woff2?|ttf|otf)(\?|$)/, r => r.abort());
  await page.goto(base + "/about/", { waitUntil: "networkidle" });
  if (mutate) await page.evaluate(`(() => { const target = ${target.toString()}; (${mutate.toString()})(); })()`);
  const runs = [];
  for (let w = SWEEP[0]; w <= SWEEP[1]; w++) runs.push({ label: `${w}px`, w, print: false });
  for (const w of EXTRA) runs.push({ label: `${w}px`, w, print: false });
  runs.push({ label: `print(${PRINT_W}px)`, w: PRINT_W, print: true });
  let fail = 0, unmeasured = null, first = null, shapes = [];
  // 규칙별로 몇 폭에서 났나 — 부순 판을 **어느 규칙이** 잡았는지 드러낸다(구조 W5 가 전 폭에서
  // 먼저 잡으면 레이아웃 규칙 W1·W2 가 살아 있는지 안 보인다)
  const tally = { W1: [], W2: [], W3: [], W4: [], W5: [] };
  for (const r of runs) {
    await page.setViewportSize({ width: r.w, height: 900 });
    await page.emulateMedia({ media: r.print ? "print" : "screen" });
    const m = await page.evaluate(measure);
    if (!m.found) { unmeasured = "「AI 팀원 N인(…) 설계」 불릿을 못 찾았다"; break; }
    if (!m.fontOk || m.failedFaces.length) {
      unmeasured = `폰트를 못 불러왔다(실패 ${JSON.stringify([...new Set(m.failedFaces)])}) — 사람이 보는 글꼴이 아닌 걸 재게 된다`; break; }
    if (m.display === "inline") { unmeasured = "불릿 본문이 인라인이다 — 줄 끝(edge)·넘침 전제가 깨진다"; break; }
    const j = judge(m);
    if (!j) { unmeasured = "문구 정규식이 안 맞는다 — 검사할 글자가 0개다"; break; }
    if (!first) first = j.units;
    const last = shapes[shapes.length - 1];
    const key = `줄 ${j.nLines}`;
    if (!r.print && r.w <= SWEEP[1] && last && last.key === key && !last.bad && !j.bad) last.to = r.w;
    else shapes.push({ key, from: r.label, to: null, bad: j.bad });
    if (j.split.length) tally.W1.push(r.label);
    if (j.heads.length) tally.W2.push(r.label);
    if (j.overflow) tally.W3.push(r.label);
    if (j.early.length) tally.W4.push(r.label);
    if (j.loose.length) tally.W5.push(r.label);
    if (j.bad) {
      fail++;
      log(`${r.label.padEnd(12)} FAIL · ${key}` +
        (j.split.length ? ` · 쪼개짐 ${JSON.stringify(j.split)}` : "") +
        (j.heads.length ? ` · 줄머리「·」 ${JSON.stringify(j.heads)}` : "") +
        (j.early.length ? ` · 일찍 끊김 ${JSON.stringify(j.early)}` : "") +
        (j.loose.length ? ` · 구조(nowrap 밖) ${JSON.stringify(j.loose)}` : "") +
        (j.overflow ? ` · 가로넘침 ${j.overflow}px` : ""));
    }
  }
  await page.close();
  if (!unmeasured) {
    log(`훑은 폭 ${runs.length}개(${SWEEP[0]}~${SWEEP[1]}px 1px · ${EXTRA.join("·")}px · print) · 묶음 ${first}`);
    log("모양: " + shapes.filter(s => !s.bad).map(s => `${s.from}${s.to ? "~" + s.to + "px" : ""} ${s.key}`).join(" / "));
  }
  // 폭 목록을 구간으로 접는다 — "440px~485px"
  const ranges = ls => {
    const out = [];
    for (const l of ls) {
      const w = parseInt(l, 10), last = out[out.length - 1];
      if (/^\d+px$/.test(l) && last && last.to + 1 === w) last.to = w;
      else out.push(/^\d+px$/.test(l) ? { from: w, to: w } : { raw: l });
    }
    return out.map(o => o.raw || (o.from === o.to ? `${o.from}` : `${o.from}~${o.to}`)).join(",");
  };
  const rules = Object.entries(tally).filter(([, v]) => v.length).map(([k, v]) => `${k} ${v.length}폭[${ranges(v)}]`).join(" · ");
  return { fail, unmeasured, rules };
}

(async () => {
  if (!fs.existsSync(DIST)) {
    console.log("dist/ 가 없다 — 먼저 빌드해라. 「못 쟀다」지 통과가 아니다");
    process.exit(2);
  }
  const selfTest = process.argv.includes("--self-test");
  const srv = await serve(DIST);
  const base = "http://127.0.0.1:" + srv.address().port;
  let b;
  try {
    b = await chromium.launch({ headless: true });
  } catch (e) {
    srv.close();
    console.log("못 쟀다 — 이 환경에서 브라우저가 안 뜬다: " + String(e).split("\n")[0]);
    console.log("  ⇒ WSL 이면 Windows 쪽 node 로 돌려라. 이건 **위반이 아니다.**");
    process.exit(2);
  }
  const ver = `판: playwright ${require("playwright/package.json").version} · ${new Date().toISOString()}`;
  const real = await sweep(b, base);
  if (real.unmeasured) {
    console.log(ver); console.log("못 쟀다 — " + real.unmeasured);
    await b.close(); srv.close(); process.exit(2);
  }
  let dead = 0;
  if (selfTest) {
    // 원판이 초록일 때만 의미가 있다 — 원판이 빨강이면 부순 판의 빨강은 아무것도 증명 못 한다
    if (real.fail) { console.log(ver); console.log(`FAIL ${real.fail} — 원판이 빨강이라 자체 시험을 안 돈다`);
      await b.close(); srv.close(); process.exit(1); }
    for (const [name, fn] of Object.entries(MUTANTS)) {
      const r = await sweep(b, base, { mutate: fn, quiet: true });
      const ok = !r.unmeasured && r.fail > 0;
      if (!ok) dead++;
      console.log(`자체시험 ${name}: ${r.unmeasured ? "못 쟀다(" + r.unmeasured + ")" : `빨강 ${r.fail}폭`} → ${ok ? "잡힘" : "🔴 안 잡힘"}` +
                  (r.rules ? `\n    ${r.rules}` : ""));
    }
    const f = await sweep(b, base, { blockFonts: true, quiet: true });
    const fok = !!f.unmeasured && /폰트/.test(f.unmeasured);
    if (!fok) dead++;
    console.log(`자체시험 폰트 막기: ${f.unmeasured ? "못 쟀다(" + f.unmeasured.slice(0, 30) + "…)" : `빨강 ${f.fail}폭`} → ${fok ? "잡힘" : "🔴 안 잡힘"}`);
  }
  console.log(ver);
  await b.close(); srv.close();
  if (dead) { console.log(`검사 죽음 — 부순 판 ${dead}개가 안 잡혔다`); process.exit(3); }
  console.log(real.fail ? `FAIL ${real.fail}폭` : "PASS");
  process.exit(real.fail ? 1 : 0);
})();
