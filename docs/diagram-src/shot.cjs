const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 820, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto("file:///C:/dev/tech-blog/docs/diagram-src/preview.html");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "C:\\dev\\tech-blog\\docs\\diagram-src\\preview.png", fullPage: true });
  await browser.close();
  console.log("ok");
})();
