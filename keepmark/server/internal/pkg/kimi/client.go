package kimi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const DefaultBaseURL = "https://api.moonshot.cn/v1"

// Config configures the Kimi (Moonshot) API client.
type Config struct {
	BaseURL        string
	APIKey         string
	GrammarModel   string
	TranslateModel string
	Timeout        time.Duration
}

// Client calls Kimi chat completions API (OpenAI-compatible).
type Client struct {
	baseURL            string
	apiKey             string
	grammarModel       string
	translateModelName string
	httpClient         *http.Client
}

// NewClient creates a Kimi API client.
func NewClient(cfg Config) (*Client, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("kimi: api_key is required")
	}
	baseURL := strings.TrimRight(cfg.BaseURL, "/")
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	grammarModel := cfg.GrammarModel
	if grammarModel == "" {
		grammarModel = "moonshot-v1-32k"
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 25 * time.Second
	}
	return &Client{
		baseURL:            baseURL,
		apiKey:             cfg.APIKey,
		grammarModel:       grammarModel,
		translateModelName: cfg.TranslateModel,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}, nil
}

// ChatCompletion sends a chat completion request and returns assistant content.
func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (string, error) {
	if req.Model == "" {
		req.Model = c.grammarModel
	}
	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("kimi: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/chat/completions",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", fmt.Errorf("kimi: build request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("kimi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("kimi: read body: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("kimi: api error status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var parsed ChatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("kimi: decode response: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("kimi: empty choices")
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

// PromptVersion returns the grammar prompt version for cache keys.
func PromptVersion() string {
	return grammarPromptVersion
}
