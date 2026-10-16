// docs/og-src/default-og.html → public/default-og.png (1200×630)
const { chromium } = require(process.env.PW || "playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto("file:///" + path.resolve(__dirname, "default-og.html").replace(/\\/g, "/"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const out = process.argv[2] || path.resolve(__dirname, "../../public/default-og.png");
  await p.locator(".og").screenshot({ path: out });
  await b.close();
  console.log("ok", out);
})();
