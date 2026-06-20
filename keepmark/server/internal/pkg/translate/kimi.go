package translate

import (
	"context"
	"fmt"
	"strings"

	"server/internal/pkg/kimi"
)

// KimiTranslator implements Translator using Kimi chat completions.
type KimiTranslator struct {
	client *kimi.Client
}

// NewKimiTranslator wraps a Kimi client as the KeepMark translate provider.
func NewKimiTranslator(client *kimi.Client) *KimiTranslator {
	return &KimiTranslator{client: client}
}

// Translate calls Kimi for Popover translation.
func (t *KimiTranslator) Translate(ctx context.Context, in SelectionContext) (*Result, error) {
	out, err := t.client.TranslateSelection(ctx, kimi.TranslateInput{
		Selection: in.Selection,
		Sentence:  in.Sentence,
	})
	if err != nil {
		return nil, err
	}
	if out == nil {
		return nil, fmt.Errorf("translate: empty kimi response")
	}

	return &Result{
		Word:        firstNonEmpty(out.Word, in.Selection),
		Lemma:       normalizeLemma(firstNonEmpty(out.Lemma, in.Selection)),
		Pos:         out.Pos,
		Meaning:     strings.TrimSpace(out.Meaning),
		Collocation: out.Collocation,
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func normalizeLemma(text string) string {
	word := strings.TrimSpace(text)
	if strings.Contains(word, " ") {
		return strings.ToLower(word)
	}
	return strings.ToLower(strings.Trim(word, `"'.,;:!?`))
}
