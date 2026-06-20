/** Matches server/internal/pkg/kimi LearningResult JSON shape. */

export interface VocabItem {
  text: string;
  translation: string;
  /** 单词 / 短语 / 搭配 等 */
  kind?: string;
  /** 全库累计出现次数（mock 或服务端） */
  occurrence_count?: number;
  note?: string;
}

export interface GrammarBreakdown {
  main_clause: string;
  clauses?: string[];
  subject?: string;
  predicate?: string;
  object?: string;
  modifiers?: string[];
  details?: string[];
}

export interface SimilarSentence {
  english: string;
  translation: string;
}

export interface LearningResult {
  translation: string;
  vocabulary: VocabItem[];
  grammar: GrammarBreakdown;
  why_written: string;
  similar_sentences: SimilarSentence[];
}
