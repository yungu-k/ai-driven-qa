import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
  count: number;
};

/**
 * Builds a de-duplicated, sorted tag list from posts.
 *
 * - Drafts and scheduled posts are excluded via `postFilter()`
 * - `tag` is the slug used in URLs; `tagName` is the original label for display
 * - Uniqueness is based on the slug (so differently-cased labels collapse)
 * - `count` is the number of posts carrying the tag (per-post de-duplicated)
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  const counts = new Map<string, Tag>();
  posts.filter(postFilter).forEach(post => {
    const seen = new Set<string>();
    post.data.tags.forEach(tagName => {
      const tag = slugifyStr(tagName);
      if (seen.has(tag)) return;
      seen.add(tag);
      const entry = counts.get(tag);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(tag, { tag, tagName, count: 1 });
      }
    });
  });
  return [...counts.values()].sort((tagA, tagB) =>
    tagA.tag.localeCompare(tagB.tag)
  );
}
