import type { LearningResult } from "./learning-types";

const INVESTOR_SENTENCE =
  "Although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns.";

export const MOCK_INVESTOR_LEARNING: LearningResult = {
  translation:
    "尽管许多投资者明白耐心至关重要，但当市场变得波动剧烈时，他们往往会做出冲动决策，而这可能严重损害其长期回报。",
  vocabulary: [
    {
      text: "investor",
      kind: "n.",
      occurrence_count: 12,
      translation: "投资者",
      note: "可数名词，financial context 高频",
    },
    {
      text: "patience is essential",
      kind: "短语",
      occurrence_count: 1,
      translation: "耐心至关重要",
      note: "主系表 + 形容词，常见论述句型",
    },
    {
      text: "impulsive decisions",
      kind: "搭配",
      occurrence_count: 3,
      translation: "冲动决策",
      note: "形容词 + 名词搭配",
    },
    {
      text: "volatile",
      kind: "adj.",
      occurrence_count: 5,
      translation: "波动剧烈的；不稳定的",
      note: "形容市场、价格",
    },
    {
      text: "long-term returns",
      kind: "搭配",
      occurrence_count: 2,
      translation: "长期回报",
      note: "金融术语，returns 常用复数",
    },
    {
      text: "make decisions",
      kind: "搭配",
      occurrence_count: 8,
      translation: "做出决定",
      note: "动词 + 名词固定搭配",
    },
  ],
  grammar: {
    main_clause: "they often make impulsive decisions",
    clauses: [
      "Although many investors understand that patience is essential（让步状语从句）",
      "when the market becomes volatile（时间状语从句）",
      "which can seriously damage their long-term returns（非限制性定语从句）",
    ],
    subject: "they（指代 investors）",
    predicate: "often make",
    object: "impulsive decisions",
    modifiers: [
      "Although…essential 置于句首，表示让步",
      "when…volatile 说明冲动决策发生的条件",
      "which…returns 补充说明后果",
    ],
    details: [
      "时态：一般现在时，描述普遍现象",
      "understand 后接 that 引导的宾语从句",
      "become + 形容词（系表结构）",
    ],
  },
  why_written:
    "典型「让步—行为—后果」论述结构：先承认理性共识（耐心重要），再指出实际偏差（波动时冲动），最后用 which 从句点明代价。常见于财经评论与投资者教育，逻辑清晰、说服力强。",
  similar_sentences: [
    {
      english:
        "Although students know that consistent practice matters, they often procrastinate when exams seem distant, which can weaken their final performance.",
      translation:
        "尽管学生知道坚持练习很重要，但当考试显得还很遥远时，他们往往会拖延，这可能削弱最终表现。",
    },
    {
      english:
        "Although managers recognize that planning is crucial, they frequently cut corners when deadlines pressure them, which can undermine project quality.",
      translation:
        "尽管管理者认识到规划至关重要，但在截止日期压力下他们经常走捷径，这可能损害项目质量。",
    },
  ],
};

const NOTWITHSTANDING_LEARNING: LearningResult = {
  translation: "尽管存在风险，该决定仍是最终决定。",
  vocabulary: [
    {
      text: "notwithstanding",
      kind: "adv.",
      occurrence_count: 4,
      translation: "尽管；虽然",
      note: "正式用语，相当于 in spite of",
    },
    {
      text: "the risks",
      kind: "n.",
      occurrence_count: 6,
      translation: "风险",
      note: "可数名词复数",
    },
    {
      text: "was final",
      kind: "短语",
      occurrence_count: 1,
      translation: "是最终的",
      note: "系表结构",
    },
  ],
  grammar: {
    main_clause: "The decision was final",
    clauses: ["notwithstanding the risks（插入语/状语）"],
    subject: "The decision",
    predicate: "was",
    object: "final（表语）",
    modifiers: ["notwithstanding the risks 作让步状语，置于主语与谓语之间"],
    details: ["时态：一般过去时", "插入语用逗号与主句隔开"],
  },
  why_written:
    "把 notwithstanding 放在主语与谓语之间，既保留正式语气，又在语义上先让步再下判断，常见于法律与新闻文体。",
  similar_sentences: [
    {
      english: "The policy, notwithstanding public debate, took effect immediately.",
      translation: "尽管存在公众争论，该政策仍立即生效。",
    },
    {
      english: "The team, notwithstanding injuries, secured a decisive victory.",
      translation: "尽管有伤病，该队仍取得决定性胜利。",
    },
  ],
};

export function getMockLearning(sentence: string, selection = ""): LearningResult {
  const text = (sentence || selection).toLowerCase();
  if (
    text.includes("investor") ||
    text.includes("volatile") ||
    text.includes("impulsive")
  ) {
    return MOCK_INVESTOR_LEARNING;
  }
  if (text.includes("notwithstanding")) {
    return NOTWITHSTANDING_LEARNING;
  }
  return {
    ...MOCK_INVESTOR_LEARNING,
    translation: "（演示）请先选中预览文章中的英文句子，或接后端 Kimi 返回真实数据。",
  };
}

export { INVESTOR_SENTENCE };
