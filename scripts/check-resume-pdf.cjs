// 이력서 인쇄 검사 — 규격 `docs/resume-pdf-layout-v1.md` §8
//
// 🔴 **인쇄는 「몇 쪽인가」로 잰다.** 「그려졌나」를 재는 도구로는 안 나온다 —
// 실제로 PDF 를 뽑아서 **`/Type /Page` 수를 센다.**
//
// ⚠ **이 검사가 §5-1 의 유일한 그물이다.** 인쇄 압축은 Tailwind 유틸리티를 직접
// 겨냥하는 방식이라, 누가 `text-sm` 을 `text-[13px]` 로 바꾸면 **인쇄가 조용히
// 되돌아가고 아무 빨강도 안 난다.** 쪽수만이 그걸 본다.
//
// 🔴 **WSL 에서는 안 돈다.** Playwright Chromium 이 `libnspr4.so` 를 못 찾는다 —
// **대상이 어긴 게 아니라 검사가 못 뜬 것**이다. 둘을 못 가르면 「이력서가 규격을
// 어겼다」로 읽힌다. ⇒ 브라우저가 안 뜨면 **종료 코드 2(못 쟀다)** 로 끝낸다.
//
// 실행 — **Windows 쪽 node 로**(playwright 는 이 저장소에 없어 다른 저장소 것을 빌린다):
//   cd /mnt/c/dev/tech-blog && NODE_PATH='C:\dev\ai-team-office\node_modules' \
//     WSLENV=NODE_PATH cmd.exe /c node scripts\check-resume-pdf.cjs
//
// ⚠ **종료 코드는 인자를 분리해 부르면 보존된다**(QA 실측). 뭉개지는 것은
// `cmd /c "명령 전체를 한 덩어리로"` 나 `powershell -Command "…"` 쪽이다 —
// 그때는 powershell 에 `; exit $LASTEXITCODE` 를 붙여야 한다.
//
// 종료 코드: **0 통과 · 1 규격 위반 · 2 못 쟀다**(브라우저 없음·`dist` 없음)
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
  // 🔴 **「검사가 못 떴다」와 「대상이 어겼다」를 가른다.** 여기서 1 로 끝내면
  // WSL 에서 돌린 사람이 **이력서가 규격을 어긴 줄 안다**(QA 지적).
  let b;
  try {
    b = await chromium.launch({ headless: true });
  } catch (e) {
    srv.close();
    console.log("못 쟀다 — 이 환경에서 브라우저가 안 뜬다: " + String(e).split("\n")[0]);
    console.log("  ⇒ WSL 이면 Windows 쪽 node 로 돌려라. 이건 **규격 위반이 아니다.**");
    process.exit(2);
  }
  const page = await b.newPage();
  const fails = [], notes = [];
  const ok = (id, cond, why) => { const v = !!cond;
    if (!v) fails.push(`${id} ${why}`); notes.push(`${id} ${v ? "PASS" : "FAIL"}`); };

  await page.goto(base + "/about/", { waitUntil: "networkidle" });

  // R9b — **화면 쪽도 같이 잰다.** 사진 두 장을 겹쳐 두고 매체로 가르는 구조라
  // **반대 방향 사고**가 생긴다: `print-only` 가 빠지면 **이력서 사진이 About 화면에 뜬다.**
  // 인쇄만 재는 검사는 그걸 통과시킨다(변이로 확인했다). ⇒ 매체마다 한 장씩.
  const screenImgs = await page.evaluate(() => [...document.querySelectorAll("#main-content img")]
    .filter(e => (e.checkVisibility ? e.checkVisibility() : true))
    .map(e => new URL(e.currentSrc || e.src).pathname));
  ok("R9b", screenImgs.length === 1 && /profile\.jpg/.test(screenImgs[0]),
     `화면에 보이는 사진이 프로필 사진 하나가 아니다: ${JSON.stringify(screenImgs)}`);

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
  // ⚠ **목록에 없는 것은 안 본다.** 인용 배너(§5)가 그 구멍으로 빠져나갔다 — CSS 는
  // `.about-quote` 를 숨기는데 **마크업에 그 클래스가 없어서** 종이에 실렸고, 이 검사는
  // 헤더·푸터·버튼만 보고 PASS 를 냈다. 숨기기로 한 것은 **전부 여기 적는다.**
  // 🔴 **「안 보인다」만 재면 클래스가 사라진 날을 못 잡는다.** `.about-quote` 를 마크업에서
  // 지우면 선택자가 0개를 맞히고 **「안 보인다」로 통과한다** — 배너는 종이에 그대로 실린 채로.
  // (변이로 확인했다: 클래스 제거 → 전 항목 PASS.) ⇒ **존재부터 단언한다.**
  const shown = await page.evaluate(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)]
      .filter(e => (e.checkVisibility ? e.checkVisibility() : e.offsetParent !== null)).length;
    const dom = (sel) => document.querySelectorAll(sel).length;
    return { vis: { header: vis("header"), footer: vis("footer"), btn: vis("#resume-pdf"),
                    nav: vis("nav"), quote: vis(".about-quote"), noPrint: vis(".no-print") },
             dom: { quote: dom(".about-quote"), noPrint: dom(".no-print"), printOnly: dom(".print-only") } };
  });
  ok("R2", Object.values(shown.vis).every(n => n === 0),
     `화면 장치가 인쇄에 남았다: ${JSON.stringify(shown.vis)}`);
  ok("R2b", Object.values(shown.dom).every(n => n > 0),
     `매체를 가르는 클래스가 마크업에서 사라졌다: ${JSON.stringify(shown.dom)} — ` +
     `하나라도 0 이면 R2 는 「안 보인다」로 조용히 통과한다`);

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

  // R9 — 종이에 실리는 사진은 **이력서 사진 하나뿐**이다 (오너 결정 2026-10-12).
  // 🔴 **「새 사진이 있다」가 아니라 「옛 사진이 없다」까지 센다.** 둘 다 보이면 헤더에
  // 사진 두 장이 찍히고, 클래스 하나만 지워져도 **풍경이 조용히 돌아온다.**
  const imgs = await page.evaluate(() => [...document.querySelectorAll("#main-content img")]
    .filter(e => (e.checkVisibility ? e.checkVisibility() : true))
    .map(e => new URL(e.currentSrc || e.src).pathname));
  ok("R9", imgs.length === 1 && /resume-photo/.test(imgs[0]),
     `인쇄에 실린 사진이 이력서 사진 하나가 아니다: ${JSON.stringify(imgs)}`);

  // R10 — **굵은 글자가 과반이면 강조가 죽는다.** 0색이라 색으로 못 나누는 만큼
  // 굵기가 유일한 강조 축이다. `[class*="text-accent"]` 를 `main` 밖으로 풀면
  // `<body class="… selection:text-accent-foreground …">` 에 걸려 **100% 가 된다**(실측).
  // ⚠ **쪽수(R1)는 이걸 못 본다** — 전부 굵어도 2쪽이었다. 그래서 축을 따로 잰다.
  const BOLD_MAX = 40;   // 화면이 18.4%, 지금 인쇄본이 17.7% — 40% 는 「과반 전 경보」다
  const bold = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let total = 0, heavy = 0, n;
    while ((n = w.nextNode())) {
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (!t) continue;
      const el = n.parentElement;
      if (el.checkVisibility && !el.checkVisibility()) continue;
      total += t.length;
      if (parseInt(getComputedStyle(el).fontWeight, 10) >= 600) heavy += t.length;
    }
    return { total, heavy, pct: total ? +(100 * heavy / total).toFixed(1) : 0 };
  });
  ok("R10", bold.total > 0 && bold.pct <= BOLD_MAX,
     `굵은 글자가 ${bold.pct}% (${bold.heavy}/${bold.total}자) — 상한 ${BOLD_MAX}%. 강조가 바탕과 같아진다`);

  console.log(`판: playwright ${require("playwright/package.json").version} · ` +
              `A4 ${pages}쪽 · ${new Date().toISOString()}`);
  console.log(notes.join(" · "));
  console.log(fails.length ? "FAIL:\n  - " + fails.join("\n  - ") : "PASS");
  await b.close(); srv.close();
  process.exit(fails.length ? 1 : 0);
})();
