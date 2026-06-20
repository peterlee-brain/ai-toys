package kimi

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

const learningPromptVersion = "learning-v1"

// LearningInput is passed to ExplainLearning.
type LearningInput struct {
	Sentence string
}

// VocabItem is a word, phrase, or collocation worth learning.
type VocabItem struct {
	Text        string `json:"text"`
	Translation string `json:"translation"`
	Note        string `json:"note,omitempty"`
}

// GrammarBreakdown describes sentence structure.
type GrammarBreakdown struct {
	MainClause string   `json:"main_clause"`
	Clauses    []string `json:"clauses,omitempty"`
	Subject    string   `json:"subject,omitempty"`
	Predicate  string   `json:"predicate,omitempty"`
	Object     string   `json:"object,omitempty"`
	Modifiers  []string `json:"modifiers,omitempty"`
	Details    []string `json:"details,omitempty"`
}

// SimilarSentence is an imitation example.
type SimilarSentence struct {
	English     string `json:"english"`
	Translation string `json:"translation"`
}

// LearningResult is the structured JSON shape we ask Kimi to return.
type LearningResult struct {
	Translation      string            `json:"translation"`
	Vocabulary       []VocabItem       `json:"vocabulary"`
	Grammar          GrammarBreakdown  `json:"grammar"`
	WhyWritten       string            `json:"why_written"`
	SimilarSentences []SimilarSentence `json:"similar_sentences"`
}

const learningSystemPrompt = `你是 KeepMark 的英语学习助教。用户给你一句英文，请按结构化 JSON 输出学习材料。

要求：
1. 输出必须是合法 JSON，不要 Markdown 代码块。
2. 使用简体中文。
3. translation：自然、准确的中文整句翻译。
4. vocabulary：提取值得学习的生词、短语、固定搭配（3～8 项）。
5. grammar：说明主句、从句、主语、谓语、宾语、修饰成分；details 可补充时态、语态、连接词等。
6. why_written：说明这句话为什么这样写（语用、逻辑、修辞或常见写作模式）。
7. similar_sentences：恰好 2 条类似句子，每条含 english 与 translation。

JSON Schema：
{
  "translation": "string",
  "vocabulary": [
    { "text": "string", "translation": "string", "note": "string" }
  ],
  "grammar": {
    "main_clause": "string",
    "clauses": ["string"],
    "subject": "string",
    "predicate": "string",
    "object": "string",
    "modifiers": ["string"],
    "details": ["string"]
  },
  "why_written": "string",
  "similar_sentences": [
    { "english": "string", "translation": "string" }
  ]
}`

// BuildLearningUserPrompt returns the free-form learning prompt (no JSON constraint).
func BuildLearningUserPrompt(sentence string) string {
	return fmt.Sprintf(`请帮我学习下面这句英文。
要求：

先给出自然、准确的中文翻译；
提取里面值得学习的生词、短语和固定搭配；
解释句子的语法结构，包括主句、从句、主语、谓语、宾语、修饰成分；
说明这句话为什么这样写；
最后给我 2 个类似句子【也带上中文翻译】，方便我模仿造句。

英文句子：
"%s"`, strings.TrimSpace(sentence))
}

// LearningPromptVersion returns the learning prompt version for cache keys.
func LearningPromptVersion() string {
	return learningPromptVersion
}

// ExplainLearningFreeForm calls Kimi with the free-form learning prompt and returns raw text.
func (c *Client) ExplainLearningFreeForm(ctx context.Context, in LearningInput) (string, error) {
	sentence := strings.TrimSpace(in.Sentence)
	if sentence == "" {
		return "", fmt.Errorf("kimi learning: sentence is empty")
	}

	return c.ChatCompletion(ctx, ChatRequest{
		Model: c.grammarModel,
		Messages: []ChatMessage{
			{Role: "user", Content: BuildLearningUserPrompt(sentence)},
		},
		Temperature: 0.3,
		MaxTokens:   4096,
	})
}

// ExplainLearning calls Kimi with a JSON-schema system prompt and parses LearningResult.
func (c *Client) ExplainLearning(ctx context.Context, in LearningInput) (*LearningResult, error) {
	sentence := strings.TrimSpace(in.Sentence)
	if sentence == "" {
		return nil, fmt.Errorf("kimi learning: sentence is empty")
	}

	content, err := c.ChatCompletion(ctx, ChatRequest{
		Model: c.grammarModel,
		Messages: []ChatMessage{
			{Role: "system", Content: learningSystemPrompt},
			{Role: "user", Content: fmt.Sprintf("请分析并输出 JSON。\n\n英文句子：\n%s", sentence)},
		},
		Temperature: 0.3,
		MaxTokens:   4096,
	})
	if err != nil {
		return nil, err
	}

	return parseLearningJSON(content)
}

func parseLearningJSON(content string) (*LearningResult, error) {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	var result LearningResult
	if err := json.Unmarshal([]byte(trimmed), &result); err != nil {
		return nil, err
	}
	if result.Translation == "" {
		return nil, fmt.Errorf("missing translation")
	}
	return &result, nil
}
