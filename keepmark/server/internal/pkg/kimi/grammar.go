package kimi

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// ExplainGrammar calls Kimi to produce structured grammar analysis for a sentence.
func (c *Client) ExplainGrammar(ctx context.Context, in GrammarInput) (*GrammarOutput, error) {
	sentence := strings.TrimSpace(in.Sentence)
	if sentence == "" {
		sentence = strings.TrimSpace(in.Selection)
	}
	if sentence == "" {
		return nil, fmt.Errorf("kimi grammar: sentence is empty")
	}

	userPrompt := fmt.Sprintf(`【完整句子】
%s

【用户选中】
%s

【前文】
%s

【后文】
%s

请分析该句语法结构。`, sentence, in.Selection, in.ContextBefore, in.ContextAfter)

	content, err := c.ChatCompletion(ctx, ChatRequest{
		Model: c.grammarModel,
		Messages: []ChatMessage{
			{Role: "system", Content: grammarSystemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.3,
		MaxTokens:   1024,
	})
	if err != nil {
		return nil, err
	}

	result, err := parseGrammarJSON(content)
	if err != nil {
		return nil, fmt.Errorf("kimi grammar: parse json: %w", err)
	}

	highlight := strings.TrimSpace(in.Selection)
	if parts := strings.Fields(highlight); len(parts) > 0 {
		highlight = parts[0]
	}

	return &GrammarOutput{
		Sentence:  sentence,
		Highlight: highlight,
		Gist:      result.Gist,
		Bullets:   result.Bullets,
		Hint:      result.Hint,
	}, nil
}

func parseGrammarJSON(content string) (*GrammarResult, error) {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	var result GrammarResult
	if err := json.Unmarshal([]byte(trimmed), &result); err != nil {
		return nil, err
	}
	if result.Gist == "" {
		return nil, fmt.Errorf("missing gist")
	}
	return &result, nil
}
