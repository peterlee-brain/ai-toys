export function normalizeWord(text: string): string {
  return text.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

export function splitSentenceWords(sentence: string): string[] {
  return sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SENTENCE_BOUNDARY = /[.!?\n\r\u3002\uFF01\uFF1F]/;
const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "TD",
  "TH",
  "DT",
  "DD",
  "PRE",
  "LABEL",
]);

/** 从选区节点向上找合适的文本块（段落/标题等），避免整页 body 噪声 */
export function closestTextBlock(node: Node | null): HTMLElement | null {
  let el: Element | null =
    node instanceof Element ? node : node?.parentElement ?? null;

  while (el && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      if (BLOCK_TAGS.has(el.tagName)) return el;

      // Reddit 标题等常见落在 a/span/div；取「无子块、长度适中」的容器
      if (el.tagName === "A" || el.tagName === "SPAN" || el.tagName === "DIV") {
        const text = (el.innerText || "").replace(/\s+/g, " ").trim();
        if (
          text.length > 0 &&
          text.length <= 420 &&
          !el.querySelector("p, h1, h2, h3, h4, h5, h6, li, article")
        ) {
          return el;
        }
      }
    }
    el = el.parentElement;
  }
  return null;
}

export function blockTextFromRange(range: Range): string {
  const block = closestTextBlock(range.commonAncestorContainer);
  if (block) return (block.innerText || "").trim();
  const raw = range.commonAncestorContainer.textContent || "";
  return raw.trim();
}

/**
 * 在给定文本中截取包含 selection 的句子。
 * rootText 应为选区所在块的文本，而不是整页 body。
 */
export function extractSentence(text: string, rootText: string): string {
  const needle = text.trim();
  if (!needle) return "";

  const full = rootText.replace(/\s+/g, " ").trim();
  if (!full) return needle;

  const lowerFull = full.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let idx = lowerFull.indexOf(lowerNeedle);
  if (idx === -1) return needle;

  // 若多次出现，优先选「更像词边界」的命中
  idx = findPreferredIndex(lowerFull, lowerNeedle, idx);

  let start = idx;
  let end = idx + needle.length;

  while (start > 0 && !SENTENCE_BOUNDARY.test(full[start - 1]!)) start--;
  if (start > 0 && SENTENCE_BOUNDARY.test(full[start - 1]!)) start++;
  while (start < full.length && full[start] === " ") start++;

  while (end < full.length && !SENTENCE_BOUNDARY.test(full[end]!)) end++;
  if (end < full.length && /[.!?\u3002\uFF01\uFF1F]/.test(full[end]!)) end++;

  // 防失控：块文本无句号时可能很长，以选区为中心限幅
  const MAX = 320;
  if (end - start > MAX) {
    start = Math.max(start, idx - 100);
    end = Math.min(end, idx + needle.length + 220);
    while (start > 0 && full[start] !== " ") start--;
    while (start < full.length && full[start] === " ") start++;
    while (end < full.length && full[end] !== " " && end - start < MAX + 40) {
      end++;
    }
  }

  return full.slice(start, end).trim() || needle;
}

function findPreferredIndex(
  lowerFull: string,
  lowerNeedle: string,
  firstIdx: number
): number {
  let idx = firstIdx;
  let best = firstIdx;
  let bestScore = -1;

  while (idx !== -1) {
    const before = idx === 0 ? " " : lowerFull[idx - 1]!;
    const after = lowerFull[idx + lowerNeedle.length] ?? " ";
    const boundaryBefore = !/[a-z0-9]/.test(before);
    const boundaryAfter = !/[a-z0-9]/.test(after);
    const score = (boundaryBefore ? 2 : 0) + (boundaryAfter ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = idx;
      if (score === 4) return best;
    }
    idx = lowerFull.indexOf(lowerNeedle, idx + 1);
  }
  return best;
}

export function getContext(
  text: string,
  rootText: string
): { before: string; after: string } {
  const full = rootText.replace(/\s+/g, " ").trim();
  const needle = text.trim();
  const idx = full.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return { before: "…", after: "…" };
  const before = full.slice(Math.max(0, idx - 60), idx);
  const after = full.slice(idx + needle.length, idx + needle.length + 60);
  return { before: "…" + before, after: after + "…" };
}

export function hasEnglishText(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

function normalizeContextText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** 用户是否选中了完整句子（此时走 Side Panel，不弹 Popover） */
export function isFullSentenceSelection(selection: string, sentence: string): boolean {
  const sel = selection.trim();
  if (!sel || !/\s/.test(sel)) return false;

  const sent = sentence.trim();
  const selNorm = normalizeContextText(sel);
  const sentNorm = normalizeContextText(sent);

  if (/[.!?]["')\]]*\s*$/.test(sel)) return true;
  if (selNorm === sentNorm) return true;
  if (sentNorm.startsWith(selNorm) && sentNorm.length - selNorm.length <= 2) {
    return true;
  }

  return false;
}

export function highlightInSentence(sentence: string, word: string): string {
  const w = normalizeWord(word) || word;
  const re = new RegExp(`(${w})`, "i");
  return escapeHtml(sentence).replace(re, "<strong>$1</strong>");
}
