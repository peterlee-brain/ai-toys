import type { LearningResult } from "./learning-types";
import { escapeHtml } from "./text-utils";

export interface RenderLearningOptions {
  /** CSS class prefix, e.g. "km-" or "" for preview plain classes */
  prefix?: string;
  stream?: boolean;
}

function pfx(prefix: string, name: string): string {
  return prefix ? `${prefix}${name}` : name;
}

function streamClass(prefix: string, stream: boolean): string {
  return stream ? ` ${pfx(prefix, "grammar-stream")}` : "";
}

function streamLine(prefix: string, stream: boolean): string {
  return stream ? ` ${pfx(prefix, "stream-line")}` : "";
}

function renderGrammarRows(
  learning: LearningResult,
  prefix: string,
  stream: boolean
): string {
  const g = learning.grammar;
  const sl = streamLine(prefix, stream);
  const rows: [string, string][] = [];

  if (g.main_clause) rows.push(["主句", g.main_clause]);
  if (g.subject) rows.push(["主语", g.subject]);
  if (g.predicate) rows.push(["谓语", g.predicate]);
  if (g.object) rows.push(["宾语/表语", g.object]);

  const clauseRows = (g.clauses || []).map((c, i) =>
    i === 0 ? ["从句", c] : ["", c]
  ) as [string, string][];
  rows.push(...clauseRows);

  (g.modifiers || []).forEach((m, i) => {
    rows.push([i === 0 ? "修饰成分" : "", m]);
  });

  return rows
    .map(
      ([label, value]) => `
    <div class="${pfx(prefix, "grammar-row")}${sl}">
      ${label ? `<span class="${pfx(prefix, "grammar-label")}">${escapeHtml(label)}</span>` : `<span class="${pfx(prefix, "grammar-label")}"></span>`}
      <span class="${pfx(prefix, "grammar-value")}">${escapeHtml(value)}</span>
    </div>`
    )
    .join("");
}

export function renderLearningHtml(
  learning: LearningResult,
  opts: RenderLearningOptions = {}
): string {
  const prefix = opts.prefix ?? "km-";
  const stream = opts.stream ?? true;
  const sc = streamClass(prefix, stream);
  const sl = streamLine(prefix, stream);

  const detailsHtml = (learning.grammar.details || [])
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join("");

  const similarHtml = learning.similar_sentences
    .map(
      (s, i) => `
    <div class="${pfx(prefix, "similar-card")}${sl}">
      <div class="${pfx(prefix, "similar-index")}">例句 ${i + 1}</div>
      <p class="${pfx(prefix, "similar-en")}">${escapeHtml(s.english)}</p>
      <p class="${pfx(prefix, "similar-zh")}">${escapeHtml(s.translation)}</p>
    </div>`
    )
    .join("");

  return `
    <div class="${pfx(prefix, "block-title")}${sl}">翻译</div>
    <p class="${pfx(prefix, "translation-box")}${sl}">${escapeHtml(learning.translation)}</p>

    <div class="${pfx(prefix, "block-title")}${sl}">语法结构</div>
    <div class="${pfx(prefix, "grammar-table")}${sc}">
      ${renderGrammarRows(learning, prefix, stream)}
    </div>
    ${
      detailsHtml
        ? `<ul class="${pfx(prefix, "bullet-list")}${sl}">${detailsHtml}</ul>`
        : ""
    }

    <div class="${pfx(prefix, "block-title")}${sl}">为什么这样写</div>
    <div class="${pfx(prefix, "why-box")}${sl}">${escapeHtml(learning.why_written)}</div>

    <div class="${pfx(prefix, "block-title")}${sl}">仿写例句</div>
    <div class="${pfx(prefix, "similar-list")}${sc}">
      ${similarHtml}
    </div>`;
}
