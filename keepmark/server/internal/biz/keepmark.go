package biz

import (
	"context"

	"server/internal/pkg/kimi"
	"server/internal/pkg/translate"
)

// TranslateUsecase handles Popover translation via Kimi.
type TranslateUsecase struct {
	translator translate.Translator
}

// NewTranslateUsecase creates a translate usecase.
func NewTranslateUsecase(translator translate.Translator) *TranslateUsecase {
	return &TranslateUsecase{translator: translator}
}

// Translate returns Chinese meaning for the selected text.
func (uc *TranslateUsecase) Translate(ctx context.Context, in translate.SelectionContext) (*translate.Result, error) {
	return uc.translator.Translate(ctx, in)
}

// GrammarUsecase handles Side Panel grammar via Kimi.
type GrammarUsecase struct {
	kimi *kimi.Client
}

// NewGrammarUsecase creates a grammar usecase.
func NewGrammarUsecase(client *kimi.Client) *GrammarUsecase {
	return &GrammarUsecase{kimi: client}
}

// ExplainGrammar returns structured grammar analysis for a sentence.
func (uc *GrammarUsecase) ExplainGrammar(ctx context.Context, in kimi.GrammarInput) (*kimi.GrammarOutput, error) {
	return uc.kimi.ExplainGrammar(ctx, in)
}
