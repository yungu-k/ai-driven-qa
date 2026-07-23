import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://ai-driven-qa.vercel.app/",
    title: "AI-Driven QA",
    description:
      "반복은 AI에게, 판단은 사람에게 — QA 자동화와 AI 협업의 실전 기록",
    author: "공윤구",
    profile: "",
    ogImage: "default-og.png",
    lang: "ko",
    timezone: "Asia/Seoul",
    dir: "ltr",
  },
  posts: {
    perPage: 6,
    perIndex: 6,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
      url: "",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/yungu-k" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/in/yungu-k/",
    },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
