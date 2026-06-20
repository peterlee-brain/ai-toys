package kimi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExplainGrammar(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{\"gist\":\"句意\",\"bullets\":[\"主句\"],\"hint\":\"难点\"}"}}]}`))
	}))
	defer srv.Close()

	client, err := NewClient(Config{BaseURL: srv.URL, APIKey: "test-key"})
	if err != nil {
		t.Fatal(err)
	}

	out, err := client.ExplainGrammar(context.Background(), GrammarInput{
		Selection: "notwithstanding",
		Sentence:  "The decision, notwithstanding the risks, was final.",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Gist != "句意" || len(out.Bullets) != 1 {
		t.Fatalf("unexpected output: %+v", out)
	}
}
