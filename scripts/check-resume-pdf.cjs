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

  // §3 v2 — 🔴 **「색 0개」는 폐기했다**(판 바뀜 2026-10-12, 오너). v1 은 「받는 쪽은 대개
  // 인쇄한다」를 **안 재고** 전제로 깔았다. 지금 이 PDF 가 읽히는 자리는 화면이다.
  // ⇒ 색을 쓰되 **색이 정보를 나르지 않는다**를 잰다. 세 갈래로 나눠야 한다:
  //   R3  쓰인 색이 **팔레트 안**인가 (임의 hex 가 끼면 흑백·저품질 인쇄에서 무너진다)
  //   R3b **면(배경)이 0** 인가 — 브라우저 인쇄는 배경이 기본 꺼짐이라 **틴트는 사라진다.**
  //        면에 정보를 실으면 받는 쪽 화면에서 그 정보가 통째로 없어진다
  //   R3c 강조색이 **정해진 자리에만** 쓰였나 — 색으로 뜻을 나누기 시작하면 흑백에서 잃는다
  // ⚠ 「색을 쓴다」가 「아무 색이나 쓴다」가 되는 순간을 막는 게 이 셋의 일이다.
  const PALETTE = {               // tech-blog/docs/diagram-spec.md §4 (대비 실측값)
    "rgb(28, 28, 33)": "먹 16.3:1",
    "rgb(98, 101, 110)": "보조 5.1:1",
    "rgb(79, 70, 229)": "강조 6.0:1",
    "rgb(228, 228, 233)": "장식선 1.2:1 — 선에만",
  };
  const ACCENT = "rgb(79, 70, 229)";
  const paint = await page.evaluate(() => {
    const out = { text: {}, border: {}, bg: [], accentAt: [] };
    const key = (el) => el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().split(/\s+/)[0] : "");
    for (const e of document.querySelectorAll("main, main *")) {
      if (!(e.checkVisibility ? e.checkVisibility() : true)) continue;
      const s = getComputedStyle(e);
      const hasOwnText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasOwnText) {
        out.text[s.color] = (out.text[s.color] || 0) + 1;
        if (s.color === "rgb(79, 70, 229)") out.accentAt.push(key(e));
      }
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (parseFloat(s["border" + side + "Width"]) > 0 && s["border" + side + "Style"] !== "none")
          out.border[s["border" + side + "Color"]] = (out.border[s["border" + side + "Color"]] || 0) + 1;
      }
      const bg = s.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") out.bg.push(key(e) + " " + bg);
    }
    return out;
  });
  const offPalette = [...Object.keys(paint.text), ...Object.keys(paint.border)].filter(c => !(c in PALETTE));
  ok("R3", offPalette.length === 0,
     `팔레트 밖 색이 쓰였다: ${JSON.stringify(offPalette)} — 쓰인 색 ` +
     `${JSON.stringify({ 글자: paint.text, 선: paint.border })}`);
  ok("R3b", paint.bg.length === 0,
     `인쇄에 면(배경)이 남았다: ${JSON.stringify(paint.bg)} — 배경은 기본 꺼짐이라 받는 쪽에서 사라진다`);
  // 강조색이 허용된 자리: 연락 줄 링크 · 회사 사이트 링크 · 불릿 마커. 전부 **같은 역할**이고
  // 흑백이 되면 회색 한 가지로 수렴한다 — 즉 색이 지고 있는 뜻이 없다.
  const ACCENT_OK = /^(a$|a\.r-site|span$|a\.|span\.)/;
  const accentBad = paint.accentAt.filter(k => !ACCENT_OK.test(k));
  ok("R3c", paint.accentAt.length > 0 && accentBad.length === 0,
     `강조색이 정해진 자리 밖에 쓰였다(또는 아예 안 쓰였다): ${JSON.stringify(paint.accentAt)}`);

  // ⚠ **너무 줄이면 안 읽힌다** (R8). v1 은 전부 9pt 하한이었다 — **인쇄 전제**였기 때문이다.
  // v2 는 읽는 방식으로 가른다: **정독하는 글(본문)과 훑는 글(메타·라벨)은 하한이 다르다.**
  // 🔴 하한을 낮추는 건 **완화**다. 그래서 두 단을 따로 적고, 바닥(11px)은 공통으로 둔다.
  //   본문(소개·불릿·맥락·카드 설명·제목) ≥ 12px(9pt)   메타(기간·칩·섹션 라벨·URL) ≥ 11px(8.25pt)
  const BODY_SEL = ".r-intro p, .r-bullets li, .r-bullets li span, .r-context, .r-card-t, " +
                   ".r-card-d, .r-company, .r-role-title, .r-tagline, .r-name";
  const MIN_BODY = 12, MIN_ANY = 11;
  const sizes = await page.evaluate(([bodySel, minBody, minAny]) => {
    const bad = { body: [], any: [] };
    for (const e of document.querySelectorAll("main, main *")) {
      if (!(e.checkVisibility ? e.checkVisibility() : true)) continue;
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const px = parseFloat(getComputedStyle(e).fontSize);
      const tag = e.tagName.toLowerCase() + "@" + px + "px";
      if (px < minAny) bad.any.push(tag);
      else if (px < minBody && e.matches(bodySel)) bad.body.push(tag);
    }
    return bad;
  }, [BODY_SEL, MIN_BODY, MIN_ANY]);
  ok("R8", sizes.any.length === 0 && sizes.body.length === 0,
     `글자가 하한 아래다 — 바닥 ${MIN_ANY}px 미만 ${JSON.stringify(sizes.any)} · ` +
     `본문 ${MIN_BODY}px 미만 ${JSON.stringify(sizes.body)}`);

  // R11 — 🔴 **화면에서 PDF 를 여는 쪽은 그 URL 을 누른다.** v1 은 URL 을 글자로만 적어서
  // (§4, 인쇄 전제) **눌리지 않았다** — 반면 화면 장치로 둔 칩에는 링크가 살아 있었다(뒤집혀 있었다).
  // ⇒ **PDF 안에 링크 주석이 실제로 있는지** 바이트에서 센다. 화면 DOM 으로는 못 재는 축이다.
  const uris = [...raw.matchAll(/\/URI\s*\(([^)]*)\)/g)].map(m => m[1]);
  const WANT_URI = ["github.com/yungu-k", "linkedin.com/in/yungu-k", "ai-driven-qa.vercel.app"];
  const missing = WANT_URI.filter(w => !uris.some(u => u.includes(w)));
  ok("R11", missing.length === 0,
     `PDF 안에 연락 링크가 없다: ${JSON.stringify(missing)} — 받는 쪽이 주소를 손으로 옮겨 적어야 한다`);

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
