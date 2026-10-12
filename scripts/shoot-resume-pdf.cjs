// 이력서 PDF 를 **눈으로 보는** 도구 — About 을 인쇄 매체로 렌더해 PDF 로 굽고,
// 그 PDF 의 각 쪽을 PNG 로 떠서 `tmp/resume-shots/` 에 남긴다.
//
// 🔴 **검사(check-resume-pdf.cjs)가 통과해도 디자인은 깨져 있을 수 있다.** 2026-10-12 에
// R1~R8 이 전부 초록인 채로 본문 글자 100% 가 굵었고 인용 배너가 종이에 실려 있었다.
// 수치가 못 보는 축(위계·여백·균형)은 **최종물을 열어 봐야** 한다 — 이 도구가 그 자리다.
//
// ⚠ **PDF 를 PNG 로 뜨는 길이 좁다**(WSL 실측):
//   - `pdftoppm`(poppler) 이 이 환경에 없다
//   - Edge `--headless=new --screenshot` 으로 `file:///…pdf` 를 찍으면 **빈 회색**이 나온다
//   ⇒ **pdf.js 를 브라우저 안에서 돌려** canvas 를 스크린샷한다(아래 VIEWER).
//
// 실행 — Windows 쪽 node 로(playwright 는 이 저장소에 없어 다른 저장소 것을 빌린다):
//   cd /mnt/c/dev/tech-blog && cmd.exe /c "node_modules\.bin\astro.CMD build"
//   NODE_PATH='C:\dev\ai-team-office\node_modules' WSLENV=NODE_PATH \
//     cmd.exe /c node "C:\dev\tech-blog\scripts\shoot-resume-pdf.cjs"
//
// 종료 코드: **0 찍었다 · 2 못 쟀다**(브라우저 없음·`dist` 없음·pdf.js 못 받음).
// 이건 판정 도구가 아니다 — **빨강을 내지 않는다.** 판정은 check-resume-pdf.cjs 가 한다.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "tmp", "resume-shots");
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml",
  ".pdf": "application/pdf" };

// 뷰어는 **같은 출처**에서 PDF 를 받아야 한다 — `file://` 로 열면 pdf.js 가 CORS 로 막힌다
const VIEWER = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#888}canvas{display:block;margin:8px auto;background:#fff}</style>
<script src="${PDFJS}/pdf.min.js"></script>
<script>
window.ready = (async () => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "${PDFJS}/pdf.worker.min.js";
  const doc = await pdfjsLib.getDocument("shot.pdf").promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i), vp = p.getViewport({ scale: 1.6 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height; c.id = "p" + i;
    document.body.appendChild(c);
    await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  }
  return doc.numPages;
})();
</script>`;

function serve(roots) {
  return new Promise(res => {
    const srv = http.createServer((req, rep) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      if (url === "/viewer.html") {
        rep.writeHead(200, { "Content-Type": MIME[".html"] });
        rep.end(VIEWER);
        return;
      }
      for (const root of roots) {
        let f = path.join(root, url);
        if (!f.startsWith(root)) continue;
        try { if (fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); } catch { continue; }
        try {
          rep.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
          rep.end(fs.readFileSync(f));
          return;
        } catch { /* 다음 루트 */ }
      }
      rep.writeHead(404).end();
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

(async () => {
  if (!fs.existsSync(DIST)) { console.log("dist/ 가 없다 — 먼저 빌드해라. 「못 쟀다」지 통과가 아니다"); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve([DIST, OUT]);
  const base = "http://127.0.0.1:" + srv.address().port;
  let b;
  try { b = await chromium.launch({ headless: true }); }
  catch (e) { srv.close(); console.log("못 쟀다 — 이 환경에서 브라우저가 안 뜬다: " + String(e).split("\n")[0]); process.exit(2); }

  const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const resp = await page.goto(base + "/about/", { waitUntil: "networkidle" });
  if (!resp || !resp.ok()) { await b.close(); srv.close();
    console.log("못 쟀다 — /about/ 를 못 받았다: HTTP " + (resp && resp.status())); process.exit(2); }
  await page.emulateMedia({ media: "print" });
  const mainH = await page.evaluate(() => Math.round(document.getElementById("main-content").getBoundingClientRect().height));
  const pdf = await page.pdf({ format: "A4", margin: { top: "14mm", bottom: "14mm", left: "15mm", right: "15mm" },
                               printBackground: false });
  fs.writeFileSync(path.join(OUT, "shot.pdf"), pdf);
  const raw = pdf.toString("latin1");
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const links = (raw.match(/\/Subtype\s*\/Link/g) || []).length;
  console.log(`PDF ${pages}쪽 · main ${mainH}px · 링크 주석 ${links}개 · ${pdf.length}B`);

  // pdf.js 로 쪽마다 PNG. **CDN 이 안 열리면 「못 쟀다」**다 — 조용히 0장으로 끝내지 않는다
  const viewer = await b.newPage({ viewport: { width: 1000, height: 1400 } });
  let n;
  try {
    await viewer.goto(base + "/viewer.html", { waitUntil: "networkidle" });
    n = await viewer.evaluate(() => window.ready);
  } catch (e) {
    await b.close(); srv.close();
    console.log("못 쟀다 — pdf.js 를 못 받았거나 렌더가 깨졌다: " + String(e).split("\n")[0]);
    process.exit(2);
  }
  for (let i = 1; i <= n; i++) {
    await viewer.locator("#p" + i).screenshot({ path: path.join(OUT, `page${i}.png`) });
  }
  console.log(`PNG ${n}장 → ${path.relative(ROOT, OUT)}/page1..${n}.png (열어서 봐라 — 수치가 못 보는 축이 있다)`);
  await b.close(); srv.close();
})();
