package kimi

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"
)

const sampleLearningSentence = "Although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns."

func kimiTestClient(t *testing.T) *Client {
	t.Helper()

	apiKey := strings.TrimSpace(os.Getenv("KIMI_API_KEY"))
	if apiKey == "" {
		t.Skip("KIMI_API_KEY not set; skip live Kimi test")
	}

	client, err := NewClient(Config{
		APIKey:       apiKey,
		GrammarModel: "moonshot-v1-32k",
		Timeout:      90 * time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

// TestExplainLearningFreeForm_Integration probes Kimi with the product-style free-form prompt.
func TestExplainLearningFreeForm_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skip integration test in short mode")
	}

	client := kimiTestClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	raw, err := client.ExplainLearningFreeForm(ctx, LearningInput{
		Sentence: sampleLearningSentence,
	})
	if err != nil {
		t.Fatalf("ExplainLearningFreeForm: %v", err)
	}

	t.Logf("=== Kimi free-form response (%d chars) ===\n%s", len(raw), raw)

	// Heuristic: free-form answers usually contain numbered sections or headings.
	lower := strings.ToLower(raw)
	for _, keyword := range []string{"翻译", "生词", "语法", "类似", "impulsive", "volatile"} {
		if !strings.Contains(lower, strings.ToLower(keyword)) {
			t.Logf("note: response may not mention %q", keyword)
		}
	}
}

// TestExplainLearningJSON_Integration probes Kimi with structured JSON output.
func TestExplainLearningJSON_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skip integration test in short mode")
	}

	client := kimiTestClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	out, err := client.ExplainLearning(ctx, LearningInput{
		Sentence: sampleLearningSentence,
	})
	if err != nil {
		t.Fatalf("ExplainLearning: %v", err)
	}

	pretty, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("=== Kimi JSON response ===\n%s", string(pretty))

	if out.Translation == "" {
		t.Fatal("expected non-empty translation")
	}
	if len(out.Vocabulary) == 0 {
		t.Fatal("expected vocabulary items")
	}
	if len(out.SimilarSentences) != 2 {
		t.Fatalf("expected 2 similar sentences, got %d", len(out.SimilarSentences))
	}
}
