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
// 폭: 흔한 폰 320·360·375·390·430 + 태블릿 768 + **인쇄(print 매체, A4 본문 폭 680px)**.
// ⚠ 인쇄 폭은 근사다 — `page.pdf` 안의 글자 좌표는 못 읽는다. 쪽수는 check-resume-pdf 가 잰다.
//
// 🔴 **글을 못 찾으면 통과가 아니라 「못 쟀다」다.** 문구가 바뀌어 정규식이 안 맞으면
// 검사할 글자가 0개가 되고, 0개의 집계는 전부 통과 방향이다.
//
// 실행 — check-resume-pdf 와 같다(Windows 쪽 node, 인자 분리):
//   cd /mnt/c/dev/tech-blog && NODE_PATH='C:\dev\ai-team-office\node_modules' \
//     WSLENV=NODE_PATH cmd.exe /c node scripts\check-about-wrap.cjs
//
// 종료 코드: **0 통과 · 1 위반 · 2 못 쟀다**(브라우저 없음·`dist` 없음·대상 문구 없음)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const WIDTHS = [320, 360, 375, 390, 430, 768];
const PRINT_W = 680;   // A4 210mm − 좌우 여백 15mm×2 = 180mm ≈ 680px

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml" };

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

// 페이지 안에서 돈다 — 대상 불릿의 글자마다 줄 번호를 매겨 돌려준다
function measure(){
  const li = [...document.querySelectorAll(".about-bullets li")]
    .find(e => /AI 팀원\s*\d+인/.test(e.textContent || ""));
  if (!li) return { found: false };
  const body = li.children[li.children.length - 1];
  const chars = [];
  const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    for (let i = 0; i < n.data.length; i++) {
      const rg = document.createRange();
      rg.setStart(n, i); rg.setEnd(n, i + 1);
      const rc = [...rg.getClientRects()].find(r => r.width > 0);
      chars.push({ ch: n.data[i], top: rc ? rc.top : null, h: rc ? rc.height : 0,
                   left: rc ? rc.left : null, right: rc ? rc.right : null });
    }
  }
  // 줄 번호 — 앞 글자보다 반 줄 이상 내려가면 새 줄
  let line = 0, lastTop = null;
  for (const c of chars) {
    if (c.top === null) { c.line = null; continue; }
    if (lastTop !== null && c.top > lastTop + c.h * 0.5) line++;
    c.line = line; lastTop = c.top;
  }
  const de = document.documentElement;
  return { found: true, text: chars.map(c => c.ch).join(""), lines: chars.map(c => c.line),
           lefts: chars.map(c => c.left), rights: chars.map(c => c.right),
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
  const split = [], heads = [];
  for (const [s, e] of units) {
    const ls = new Set();
    for (let i = s; i < e; i++) if (m.text[i].trim() && m.lines[i] !== null) ls.add(m.lines[i]);
    if (ls.size > 1) split.push(m.text.slice(s, e));
  }
  for (const d of dots) {
    let p = d - 1;
    while (p >= 0 && (m.lines[p] === null || !m.text[p].trim())) p--;
    if (p >= 0 && m.lines[d] !== null && m.lines[d] !== m.lines[p]) heads.push(m.text.slice(d, d + 12));
  }
  // W4 앞 줄에 들어갈 묶음이 내려왔나 — 줄바꿈 자리가 없어 **너무 일찍 끊긴** 자리.
  // 넘침·쪼개짐이 0 이어도 줄이 하나 더 는다(묶음 사이 `<wbr>` 를 뺀 변이가 실제로 그랬다).
  const early = [];
  const ext = (s, e) => {
    const L = [], R = [];
    for (let i = s; i < e; i++) if (m.lefts[i] !== null && m.text[i].trim()) { L.push(m.lefts[i]); R.push(m.rights[i]); }
    return L.length ? { left: Math.min(...L), right: Math.max(...R), line: m.lines[s] } : null;
  };
  for (let k = 1; k < chunks.length; k++) {
    const a = ext(...chunks[k - 1]), c = ext(...chunks[k]);
    if (!a || !c || c.line !== a.line + 1) continue;
    if (a.right + (c.right - c.left) <= m.edge - 1) early.push(m.text.slice(...chunks[k]));
  }
  return { units: units.length, split, heads, early, overflow: Math.max(m.docOverflow, m.liOverflow, 0),
           nLines: new Set(m.lines.slice(hit.index, hit.index + hit[0].length).filter(x => x !== null)).size };
}

(async () => {
  if (!fs.existsSync(DIST)) {
    console.log("dist/ 가 없다 — 먼저 빌드해라. 「못 쟀다」지 통과가 아니다");
    process.exit(2);
  }
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
  const runs = [...WIDTHS.map(w => ({ label: `${w}px`, w, print: false })),
                { label: `print(${PRINT_W}px)`, w: PRINT_W, print: true }];
  let fail = 0, unmeasured = 0;
  for (const r of runs) {
    const page = await b.newPage({ viewport: { width: r.w, height: 900 } });
    await page.goto(base + "/about/", { waitUntil: "networkidle" });
    if (r.print) await page.emulateMedia({ media: "print" });
    const m = await page.evaluate(measure);
    const j = m.found ? judge(m) : null;
    await page.close();
    if (!j) {
      unmeasured++;
      console.log(`${r.label.padEnd(12)} 못 쟀다 — 「AI 팀원 N인(…) 설계」 문구를 못 찾았다`);
      continue;
    }
    const bad = j.split.length || j.heads.length || j.early.length || j.overflow > 0;
    if (bad) fail++;
    console.log(`${r.label.padEnd(12)} ${bad ? "FAIL" : "PASS"} · 줄 ${j.nLines} · 묶음 ${j.units}` +
      ` · 쪼개짐 ${j.split.length}${j.split.length ? " " + JSON.stringify(j.split) : ""}` +
      ` · 줄머리「·」 ${j.heads.length}${j.heads.length ? " " + JSON.stringify(j.heads) : ""}` +
      ` · 일찍 끊김 ${j.early.length}${j.early.length ? " " + JSON.stringify(j.early) : ""}` +
      ` · 가로넘침 ${j.overflow}px`);
  }
  console.log(`판: playwright ${require("playwright/package.json").version} · ${new Date().toISOString()}`);
  await b.close(); srv.close();
  if (unmeasured) { console.log("못 쟀다 — 대상이 없는 폭이 있다. 통과가 아니다"); process.exit(2); }
  console.log(fail ? `FAIL ${fail}` : "PASS");
  process.exit(fail ? 1 : 0);
})();
