// 이력서 인쇄 검사 — 규격 `docs/resume-pdf-layout-v1.md` §8
//
// 🔴 **인쇄는 「몇 쪽인가」로 잰다.** 「그려졌나」를 재는 도구로는 안 나온다 —
// 실제로 PDF 를 뽑아서 **`/Type /Page` 수를 센다.**
//
// ⚠ **이 검사가 §5-1 의 유일한 그물이다.** 인쇄 압축은 Tailwind 유틸리티를 직접
// 겨냥하는 방식이라, 누가 `text-sm` 을 `text-[13px]` 로 바꾸면 **인쇄가 조용히
// 되돌아가고 아무 빨강도 안 난다.** 쪽수만이 그걸 본다.
//
// 실행 (playwright 가 이 저장소엔 없다 — 다른 저장소 것을 빌려 쓴다):
//   NODE_PATH=/mnt/c/dev/ai-team-office/node_modules node scripts/check-resume-pdf.cjs
//   ⚠ powershell/cmd 로 부를 때는 종료 코드가 뭉개진다 — `; exit $LASTEXITCODE` 를 붙여라
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(__dirname, "..", "dist");
const WANT_PAGES = 2;          // §2 — A4 2장. 1장은 내용을 버려야 한다

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml" };

function serve(root){
  return new Promise(res => {
    const srv = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { rep.writeHead(403).end(); return; }   // 경로 탈출 금지
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

(async () => {
  if (!fs.existsSync(DIST)) {
    console.log("dist/ 가 없다 — 먼저 빌드해라. 「못 쟀다」지 통과가 아니다");
    process.exit(2);
  }
  const srv = await serve(DIST);
  const base = "http://127.0.0.1:" + srv.address().port;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage();
  const fails = [], notes = [];
  const ok = (id, cond, why) => { const v = !!cond;
    if (!v) fails.push(`${id} ${why}`); notes.push(`${id} ${v ? "PASS" : "FAIL"}`); };

  await page.goto(base + "/about/", { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", margin: { top: "14mm", bottom: "14mm", left: "15mm", right: "15mm" },
                               printBackground: false });
  // PDF 안의 쪽 객체를 센다. `/Type /Page` 는 `/Type /Pages`(묶음)와 구분해야 한다
  const raw = pdf.toString("latin1");
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

  ok("R1", pages === WANT_PAGES, `A4 ${pages}쪽이다 — 규격은 ${WANT_PAGES}쪽`);

  // §6 버튼 문구의 쪽수와 실제 쪽수가 같은가 (R7) — **두 자리에 같은 수를 적는 것**을 막는다
  const hint = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find(e =>
      e.children.length === 0 && /PDF로 저장/.test(e.textContent || ""));
    return el ? el.textContent.trim() : null;
  });
  const claimed = hint && /A4\s*(\d+)\s*장/.exec(hint);
  ok("R7", !!claimed && Number(claimed[1]) === pages,
     `버튼 문구(${hint}) 와 실제 쪽수(${pages}) 가 다르다`);

  // §5 화면 장치가 인쇄에 안 실린다 (R2)
  // ⚠ **자기 `display` 만 보면 안 된다.** 조상이 `display:none` 이어도 자식의 계산값은
  // 그대로 `inline-block` 이라 **숨겨진 요소가 「보인다」로 잡힌다** — 실제로 이 검사가
  // 처음에 거짓 빨강을 냈다. **실제로 그려지는지**를 물어야 한다.
  const shown = await page.evaluate(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)]
      .filter(e => (e.checkVisibility ? e.checkVisibility() : e.offsetParent !== null)).length;
    return { header: vis("header"), footer: vis("footer"), btn: vis("#resume-pdf"), nav: vis("nav") };
  });
  ok("R2", Object.values(shown).every(n => n === 0),
     `화면 장치가 인쇄에 남았다: ${JSON.stringify(shown)}`);

  // §4 링크가 글자로 보인다 (R5)
  const txt = await page.textContent("main");
  ok("R5", txt.includes("github.com/yungu-k") && txt.includes("ai-driven-qa.vercel.app"),
     "URL 이 글자로 안 보인다 — 종이에서 링크는 죽는다");

  // §3 🔴 **색이 0개** (R3). ⚠ **「0색」이라고 말하려면 0색이어야 한다** — 첫 판에
  // `#1c1c21`(B 채널만 5 높은 유채색)이 174자 남아 있었다. 흑백 인쇄엔 무해했지만
  // **말이 틀렸다.** ⇒ 말로 두지 않고 **잰다.**
  const colors = await page.evaluate(() => {
    const bad = new Map();
    for (const e of document.querySelectorAll("main, main *")) {
      if (!(e.checkVisibility ? e.checkVisibility() : true)) continue;
      const c = getComputedStyle(e).color;
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
      if (!m) continue;
      const [r, g, b2] = [+m[1], +m[2], +m[3]];
      if (!(r === g && g === b2)) bad.set(c, (bad.get(c) || 0) + 1);
    }
    return [...bad.entries()];
  });
  ok("R3", colors.length === 0, `유채색이 남았다: ${JSON.stringify(colors)} — 「0색」이 말뿐이 된다`);

  // ⚠ **너무 줄이면 종이에서 안 읽힌다** (R8). 첫 판은 최소 7.5pt·본문 8.2pt 였다 —
  // 이력서 보통 9~10pt 다. **줄이는 것과 읽히는 것은 다른 축**이라 따로 잰다.
  const MIN_PX = 12;   // 9pt
  const small = await page.evaluate((min) => {
    const out = new Map();
    for (const e of document.querySelectorAll("main, main *")) {
      if (!(e.checkVisibility ? e.checkVisibility() : true)) continue;
      if (!(e.textContent || "").trim()) continue;
      const px = parseFloat(getComputedStyle(e).fontSize);
      if (px < min) out.set(px, (out.get(px) || 0) + 1);
    }
    return [...out.entries()].sort((a, b) => a[0] - b[0]);
  }, MIN_PX);
  ok("R8", small.length === 0,
     `${MIN_PX}px(9pt) 아래 글자가 있다: ${JSON.stringify(small)} — 종이에서 안 읽힌다`);

  console.log(`판: playwright ${require("playwright/package.json").version} · ` +
              `A4 ${pages}쪽 · ${new Date().toISOString()}`);
  console.log(notes.join(" · "));
  console.log(fails.length ? "FAIL:\n  - " + fails.join("\n  - ") : "PASS");
  await b.close(); srv.close();
  process.exit(fails.length ? 1 : 0);
})();
