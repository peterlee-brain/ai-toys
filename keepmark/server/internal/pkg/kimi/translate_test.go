package kimi

import (
	"context"
	"testing"
)

func TestTranslateSelection(t *testing.T) {
	client := &Client{
		baseURL:      "http://example.com",
		apiKey:       "test",
		grammarModel: "moonshot-v1-32k",
		httpClient:   nil,
	}

	_, err := parseTranslateJSON(`{"word":"volatile","lemma":"volatile","pos":"adj.","meaning":"波动剧烈的","collocation":""}`)
	if err != nil {
		t.Fatal(err)
	}

	_, err = client.TranslateSelection(context.Background(), TranslateInput{})
	if err == nil || err.Error() != "kimi translate: selection is empty" {
		t.Fatalf("expected empty selection error, got %v", err)
	}
}

func TestParseTranslateJSON(t *testing.T) {
	out, err := parseTranslateJSON("```json\n{\"meaning\":\"尽管\",\"lemma\":\"notwithstanding\"}\n```")
	if err != nil {
		t.Fatal(err)
	}
	if out.Meaning != "尽管" || out.Lemma != "notwithstanding" {
		t.Fatalf("unexpected: %+v", out)
	}
}
