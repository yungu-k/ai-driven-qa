import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

export default defineConfig({
  site: config.site.url,
  // 사이트는 그대로 정적이다. prerender = false 인 길(실험실 랭킹 src/pages/api/defense-rank.ts)만 Vercel 함수가 된다
  adapter: vercel(),
  // 실험실 릴리스 디펜스(QA 소재)는 10-28 「코코 타워 디펜스」로 바뀌었다 — 옛 주소는 새 주소로 넘긴다
  redirects: { "/lab/release-defense": "/lab/coco-td" },
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        // 실험실은 이스터에그로만 들어온다 — 사이트맵에 실으면 숨긴 의미가 없다
        !new URL(page).pathname.startsWith("/lab/") &&
        (config.features?.showArchives !== false ||
          !page.endsWith("/archives/")),
    }),
  ],
  i18n: {
    locales: ["ko", "en"],
    defaultLocale: "ko",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        [remarkToc, { heading: "목차|table of contents" }],
        [remarkCollapse, { test: /목차|table of contents/i, summary: () => "펼치기" }],
      ],
      rehypePlugins: [rehypeCallouts],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      formats: ["woff", "ttf"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
