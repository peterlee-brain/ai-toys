package pkg

import (
	"time"

	"server/internal/conf"
	"server/internal/pkg/kimi"
	"server/internal/pkg/translate"

	"github.com/google/wire"
)

// ProviderSet is external service clients for KeepMark.
var ProviderSet = wire.NewSet(
	NewKimiClient,
	NewKimiTranslator,
	wire.Bind(new(translate.Translator), new(*translate.KimiTranslator)),
)

// NewKimiClient builds Kimi API client from config.
func NewKimiClient(c *conf.Ai) (*kimi.Client, error) {
	if c == nil || c.Kimi == nil {
		return nil, kimiMissingConfigError("kimi config is nil")
	}
	timeout := 25 * time.Second
	if c.Kimi.Timeout != nil {
		timeout = c.Kimi.Timeout.AsDuration()
	}
	return kimi.NewClient(kimi.Config{
		BaseURL:        c.Kimi.BaseUrl,
		APIKey:         c.Kimi.ApiKey,
		GrammarModel:   c.Kimi.GrammarModel,
		TranslateModel: c.Kimi.TranslateModel,
		Timeout:        timeout,
	})
}

// NewKimiTranslator wires Kimi as the translate provider.
func NewKimiTranslator(client *kimi.Client) *translate.KimiTranslator {
	return translate.NewKimiTranslator(client)
}

type configError string

func (e configError) Error() string { return string(e) }

func kimiMissingConfigError(msg string) error { return configError(msg) }
