import type { DictEntry } from "./types";

export const DICT: Record<string, DictEntry> = {
  notwithstanding: {
    pos: "adv.",
    meaning: "尽管；虽然（正式用语，常置于句中或句首，相当于 in spite of）",
    collocation: "notwithstanding the fact that …",
  },
  proliferation: {
    pos: "n.",
    meaning: "激增；扩散；迅速增加（常用于政策、技术、武器等语境）",
    collocation: "proliferation of nuclear weapons",
  },
  hybrid: {
    pos: "adj.",
    meaning: "混合的；杂交的",
    collocation: "hybrid work model",
  },
  flexibility: {
    pos: "n.",
    meaning: "灵活性；弹性",
    collocation: "flexibility in scheduling",
  },
  productivity: {
    pos: "n.",
    meaning: "生产力；效率",
    collocation: "boost productivity",
  },
  collaboration: {
    pos: "n.",
    meaning: "合作；协作",
    collocation: "cross-team collaboration",
  },
  uncertainty: {
    pos: "n.",
    meaning: "不确定性",
    collocation: "economic uncertainty",
  },
  arrangements: {
    pos: "n.",
    meaning: "安排；布置",
    collocation: "make arrangements for",
  },
  decision: { pos: "n.", meaning: "决定；决策" },
  risks: { pos: "n.", meaning: "风险" },
  final: { pos: "adj.", meaning: "最终的" },
  many: { pos: "adj.", meaning: "许多的" },
  companies: { pos: "n.", meaning: "公司" },
  policies: { pos: "n.", meaning: "政策" },
  rapid: { pos: "adj.", meaning: "迅速的" },
  the: { pos: "art.", meaning: "这；那" },
  was: { pos: "v.", meaning: "是（过去式）" },
  of: { pos: "prep.", meaning: "…的" },
  amid: { pos: "prep.", meaning: "在…中" },
  employees: { pos: "n.", meaning: "员工" },
  negotiate: { pos: "v.", meaning: "谈判；协商" },
  employers: { pos: "n.", meaning: "雇主" },
  weigh: { pos: "v.", meaning: "权衡；考虑" },
  against: { pos: "prep.", meaning: "与…相对" },
  clause: { pos: "n.", meaning: "条款" },
  contracts: { pos: "n.", meaning: "合同" },
  reflects: { pos: "v.", meaning: "反映" },
  lingering: { pos: "adj.", meaning: "持续存在的；拖延的" },
  reconsidered: { pos: "v.", meaning: "重新考虑" },
  have: { pos: "v.", meaning: "有；已经" },
  while: { pos: "conj.", meaning: "而；当…时" },
  some: { pos: "adj.", meaning: "一些" },
  in: { pos: "prep.", meaning: "在…里" },
  investor: { pos: "n.", meaning: "投资者" },
  investors: { pos: "n.", meaning: "投资者（复数）" },
  understand: { pos: "v.", meaning: "理解；明白" },
  patience: { pos: "n.", meaning: "耐心" },
  essential: { pos: "adj.", meaning: "至关重要的" },
  impulsive: { pos: "adj.", meaning: "冲动的" },
  volatile: { pos: "adj.", meaning: "波动剧烈的；不稳定的" },
  returns: { pos: "n.", meaning: "回报；收益" },
  damage: { pos: "v.", meaning: "损害" },
  decisions: { pos: "n.", meaning: "决定；决策" },
  market: { pos: "n.", meaning: "市场" },
  although: { pos: "conj.", meaning: "虽然；尽管" },
  when: { pos: "conj.", meaning: "当…时" },
  which: { pos: "pron.", meaning: "哪一个；引导从句" },
  long: { pos: "adj.", meaning: "长期的" },
  term: { pos: "n.", meaning: "期限；术语" },
  they: { pos: "pron.", meaning: "他们" },
  often: { pos: "adv.", meaning: "经常" },
  make: { pos: "v.", meaning: "做；做出" },
  becomes: { pos: "v.", meaning: "变得" },
  seriously: { pos: "adv.", meaning: "严重地" },
  can: { pos: "v.", meaning: "能够" },
  their: { pos: "pron.", meaning: "他们的" },
};

export interface LookupResult extends DictEntry {
  word: string;
}

export function mockSentenceTranslation(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("investor") || lower.includes("volatile")) {
    return "尽管许多投资者明白耐心至关重要，但当市场变得波动剧烈时，他们往往会做出冲动决策，而这可能严重损害其长期回报。";
  }
  if (lower.includes("notwithstanding")) {
    return "尽管存在风险，该决定仍是最终决定。";
  }
  if (lower.includes("proliferation")) {
    return "许多公司在混合办公模式迅速激增的背景下重新考虑了其政策。";
  }
  return "这是选中句子的中文释义演示。";
}

export function lookupEntry(text: string): LookupResult {
  const word = text.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
  if (word && DICT[word]) {
    return { word, ...DICT[word] };
  }
  const isSentence = text.trim().includes(" ") || text.length > 20;
  return {
    word: text.trim(),
    pos: isSentence ? "sentence" : "word",
    meaning: isSentence
      ? "（演示）整句翻译：" + mockSentenceTranslation(text)
      : "（演示）暂无词典条目，可 ★ 留标",
    collocation: isSentence ? undefined : "—",
  };
}

export interface GrammarResult {
  gist: string;
  bullets: string[];
  hint: string;
}

export function mockGrammar(text: string, sentence: string): GrammarResult {
  const s = sentence || text;
  const lower = s.toLowerCase();
  if (lower.includes("notwithstanding")) {
    return {
      gist: "尽管存在风险，该决定仍是最终决定。",
      bullets: [
        "主句：The decision was final",
        "插入语：notwithstanding the risks（介词短语作状语）",
        "时态：一般过去时",
      ],
      hint: "notwithstanding 较正式，常置于句中或句首，相当于 in spite of。",
    };
  }
  if (lower.includes("proliferation")) {
    return {
      gist: "许多公司在混合办公模式迅速扩散的背景下重新考虑了政策。",
      bullets: [
        "主句：Many companies have reconsidered their policies",
        "状语：amid rapid proliferation of hybrid arrangements",
        "时态：现在完成时",
      ],
      hint: "amid + 名词 表示「在…背景下」。",
    };
  }
  return {
    gist: mockSentenceTranslation(s),
    bullets: [
      "（演示）请选中包含 notwithstanding 或 proliferation 的句子查看更完整解析",
      "主谓宾结构可根据谓语动词进一步拆分",
    ],
    hint: "此为演示版 mock 语法讲解，接后端后会返回真实解析。",
  };
}
