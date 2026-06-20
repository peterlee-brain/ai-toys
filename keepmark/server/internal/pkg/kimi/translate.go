package kimi

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

const translatePromptVersion = "translate-v1"

const translateSystemPrompt = `你是 KeepMark 的阅读翻译助手。根据用户选中的英文和所在句子给出简洁中文释义。

要求：
1. 输出必须是合法 JSON，不要 Markdown 代码块。
2. 使用简体中文。
3. lemma 为小写词原形；短语含空格则保留原文并整体小写。

JSON Schema：
{
  "word": "选中原词",
  "lemma": "词原形或短语（小写）",
  "pos": "词性缩写，如 n./v./adj./adv./sentence",
  "meaning": "中文释义，1～2 行",
  "collocation": "常见搭配，无则空字符串"
}

规则：
- 单词/短语：给词性 + 释义 + 搭配
- 整句选中：pos 填 sentence，meaning 为整句翻译
- 只输出 JSON`

// TranslateInput is passed to TranslateSelection.
type TranslateInput struct {
	Selection string
	Sentence  string
}

// TranslateResult is Kimi JSON for Popover translate.
type TranslateResult struct {
	Word        string `json:"word"`
	Lemma       string `json:"lemma"`
	Pos         string `json:"pos"`
	Meaning     string `json:"meaning"`
	Collocation string `json:"collocation"`
}

// TranslatePromptVersion returns translate prompt version for cache keys.
func TranslatePromptVersion() string {
	return translatePromptVersion
}

// TranslateSelection calls Kimi for Popover translation.
func (c *Client) TranslateSelection(ctx context.Context, in TranslateInput) (*TranslateResult, error) {
	selection := strings.TrimSpace(in.Selection)
	if selection == "" {
		return nil, fmt.Errorf("kimi translate: selection is empty")
	}

	userPrompt := fmt.Sprintf(`选中：%s
句子：%s`, selection, in.Sentence)

	content, err := c.ChatCompletion(ctx, ChatRequest{
		Model: c.translateModel(),
		Messages: []ChatMessage{
			{Role: "system", Content: translateSystemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.3,
		MaxTokens:   256,
	})
	if err != nil {
		return nil, err
	}

	return parseTranslateJSON(content)
}

func (c *Client) translateModel() string {
	if c.translateModelName != "" {
		return c.translateModelName
	}
	return "moonshot-v1-8k"
}

func parseTranslateJSON(content string) (*TranslateResult, error) {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	var result TranslateResult
	if err := json.Unmarshal([]byte(trimmed), &result); err != nil {
		return nil, err
	}
	if result.Meaning == "" {
		return nil, fmt.Errorf("missing meaning")
	}
	if result.Word == "" {
		result.Word = result.Lemma
	}
	if result.Lemma == "" {
		result.Lemma = strings.ToLower(strings.TrimSpace(result.Word))
	}
	return &result, nil
}
