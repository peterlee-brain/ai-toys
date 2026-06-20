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

export function extractSentence(text: string, rootText: string): string {
  const full = rootText.replace(/\s+/g, " ");
  const idx = full.toLowerCase().indexOf(text.toLowerCase());
  if (idx === -1) return text;
  let start = idx;
  let end = idx + text.length;
  while (start > 0 && !/[.!?]/.test(full[start - 1]!)) start--;
  if (start > 0 && /[.!?]/.test(full[start - 1]!)) start++;
  while (start < full.length && full[start] === " ") start++;
  while (end < full.length && !/[.!?]/.test(full[end]!)) end++;
  if (end < full.length) end++;
  return full.slice(start, end).trim();
}

export function getContext(
  text: string,
  rootText: string
): { before: string; after: string } {
  const full = rootText.replace(/\s+/g, " ");
  const idx = full.toLowerCase().indexOf(text.toLowerCase());
  if (idx === -1) return { before: "…", after: "…" };
  const before = full.slice(Math.max(0, idx - 60), idx);
  const after = full.slice(idx + text.length, idx + text.length + 60);
  return { before: "…" + before, after: after + "…" };
}

export function hasEnglishText(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

export function highlightInSentence(sentence: string, word: string): string {
  const w = normalizeWord(word) || word;
  const re = new RegExp(`(${w})`, "i");
  return escapeHtml(sentence).replace(re, "<strong>$1</strong>");
}
