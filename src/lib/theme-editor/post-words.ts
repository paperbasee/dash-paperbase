/**
 * A post's own words, as the editor's canvas draws them.
 *
 * The blog-post page's "The words" place is a choice of how WIDE a line runs,
 * and that is judged against real sentences -- so the canvas draws the shop's
 * own newest post rather than a paragraph about a leather tannery a phone
 * shop never had (2026-09-24).
 *
 * The canvas draws words, not the merchant's HTML: it never puts markup from
 * the database into the dashboard's own page. What it keeps is the shape the
 * shop gives them -- paragraphs, headings and quotes -- read the way the shop
 * reads them (`shop-paperbase` `post_text`): a body with no block of its own is
 * plain text, and its empty lines are its paragraphs.
 *
 * The body was cleaned by the API when it was saved, so its blocks are well
 * formed; this reads them, it does not check them.
 */
export type PostWord = { kind: "p" | "h" | "quote"; text: string };

/** A tag that makes a body HTML, as the shop decides it. */
const BLOCK = /<(?:p|h[1-6]|ul|ol|blockquote|figure|table|pre|hr|div)\b/i;
/** The blocks the canvas draws, each with what is inside it. */
const DRAWN = /<(h[1-6]|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

/** The text inside a block: its tags gone, its entities read, its spaces one. */
function textOf(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

/** The first `limit` blocks of a post's body, as words. */
export function postWords(body: string, limit = 4): PostWord[] {
  const words: PostWord[] = [];
  if (!BLOCK.test(body)) {
    for (const part of body.split(/\n\s*\n/)) {
      const text = textOf(part);
      if (text) words.push({ kind: "p", text });
    }
    return words.slice(0, limit);
  }
  for (const [, tag, inner] of body.matchAll(DRAWN)) {
    const text = textOf(inner);
    if (!text) continue;
    const kind = tag.toLowerCase();
    words.push({ kind: kind.startsWith("h") ? "h" : kind === "blockquote" ? "quote" : "p", text });
    if (words.length === limit) break;
  }
  return words;
}
