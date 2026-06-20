package translate

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"server/internal/pkg/kimi"
)

func TestKimiTranslator(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{\"word\":\"notwithstanding\",\"lemma\":\"notwithstanding\",\"pos\":\"adv.\",\"meaning\":\"尽管；虽然\",\"collocation\":\"notwithstanding the fact that\"}"}}]}`))
	}))
	defer srv.Close()

	client, err := kimi.NewClient(kimi.Config{BaseURL: srv.URL, APIKey: "test-key"})
	if err != nil {
		t.Fatal(err)
	}

	tr := NewKimiTranslator(client)
	out, err := tr.Translate(context.Background(), SelectionContext{
		Selection: "notwithstanding",
		Sentence:  "The decision, notwithstanding the risks, was final.",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Meaning != "尽管；虽然" || out.Lemma != "notwithstanding" {
		t.Fatalf("unexpected output: %+v", out)
	}
}
