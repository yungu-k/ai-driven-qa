import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

// 한글 글리프가 필요해 Pretendard 정적 폰트를 로컬 번들로 로드한다.
// (기존 Google Sans Code는 라틴 전용이라 한글이 전부 □로 렌더되던 문제)
const fontRegular = readFile(
  new URL("src/assets/fonts/Pretendard-Regular.otf", `file://${process.cwd().replaceAll("\\", "/")}/`)
);
const fontBold = readFile(
  new URL("src/assets/fonts/Pretendard-Bold.otf", `file://${process.cwd().replaceAll("\\", "/")}/`)
);

export const GET: APIRoute = async ({ props }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const [regularData, boldData] = await Promise.all([fontRegular, fontBold]);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0e14",
          color: "#e6e8ee",
          padding: "64px 72px 52px",
          fontFamily: "Pretendard",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "1px solid #222a3a",
                background: "rgba(22,27,38,0.6)",
                borderRadius: "999px",
                padding: "10px 22px",
                fontSize: 22,
                color: "#9aa3b5",
                alignSelf: "flex-start",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "#8b93ff",
                    },
                  },
                },
                { type: "span", props: { children: "QA Engineer × AI Agent" } },
              ],
            },
          },
          {
            type: "p",
            props: {
              style: {
                fontSize: 58,
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                maxHeight: "320px",
                overflow: "hidden",
                wordBreak: "keep-all",
              },
              children: props.data.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                width: "100%",
                fontSize: 26,
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: { fontWeight: 700, color: "#e6e8ee", fontSize: 30 },
                    children: config.site.title,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { color: "#6f7280", fontSize: 24 },
                    children: "ai-driven-qa.vercel.app",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        { name: "Pretendard", data: regularData, weight: 400, style: "normal" },
        { name: "Pretendard", data: boldData, weight: 700, style: "normal" },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
