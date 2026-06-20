package kimi

// ChatMessage is an OpenAI-compatible chat message.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the Moonshot chat completions request body.
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
}

// ChatResponse is the Moonshot chat completions response body.
type ChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// GrammarInput is passed to ExplainGrammar.
type GrammarInput struct {
	Selection     string
	Sentence      string
	ContextBefore string
	ContextAfter  string
}

// GrammarResult matches the Side Panel grammar tab.
type GrammarResult struct {
	Gist    string   `json:"gist"`
	Bullets []string `json:"bullets"`
	Hint    string   `json:"hint"`
}

// GrammarOutput adds presentation fields for API responses.
type GrammarOutput struct {
	Sentence  string
	Highlight string
	Gist      string
	Bullets   []string
	Hint      string
}

const grammarPromptVersion = "grammar-v1"

const grammarSystemPrompt = `你是 KeepMark 留标的英语语法助教。用户正在阅读英文网页，需要你针对「完整句子」做结构化语法讲解。

要求：
1. 输出必须是合法 JSON，不要 Markdown 代码块。
2. 使用简体中文。
3. bullets 3～5 条，每条说明句子成分、从句类型或时态等。
4. hint 聚焦 1 个最值得学的点。
5. 若句子含用户高亮词，在 hint 或 bullets 中点明其语法功能。

JSON Schema：
{
  "gist": "string, 一句中文句意",
  "bullets": ["string"],
  "hint": "string"
}`
