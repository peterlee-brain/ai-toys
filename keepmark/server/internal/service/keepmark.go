package service

import "server/internal/biz"

// KeepMarkService groups translate and grammar usecases (both via Kimi).
// HTTP handlers will be wired in a follow-up PR.
type KeepMarkService struct {
	Translate *biz.TranslateUsecase
	Grammar   *biz.GrammarUsecase
}

// NewKeepMarkService creates KeepMarkService.
func NewKeepMarkService(
	translate *biz.TranslateUsecase,
	grammar *biz.GrammarUsecase,
) *KeepMarkService {
	return &KeepMarkService{
		Translate: translate,
		Grammar:   grammar,
	}
}
