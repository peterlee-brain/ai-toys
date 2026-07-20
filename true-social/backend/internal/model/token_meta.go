package model

import "go.mongodb.org/mongo-driver/bson"

// TokenMeta 对应 Mongo token_meta 文档。
type TokenMeta struct {
	ID            string `bson:"_id" json:"id"`
	Chain         string `bson:"chain" json:"chain"`
	Token         string `bson:"token" json:"token"`
	Symbol        string `bson:"symbol" json:"symbol"`
	BnSymbol      string `bson:"bn_symbol" json:"bn_symbol"`
	Decimals      int    `bson:"decimals" json:"decimals"`
	IsWhitelisted bool   `bson:"is_whitelisted" json:"is_whitelisted"`
	TokenID       string `bson:"token_id,omitempty" json:"token_id,omitempty"`
	IconURL       string `bson:"icon_url,omitempty" json:"icon_url,omitempty"`
}

// UnmarshalBSON 兼容历史字段 binance_symbol。
func (m *TokenMeta) UnmarshalBSON(data []byte) error {
	type alias TokenMeta
	aux := struct {
		alias         `bson:",inline"`
		BinanceSymbol string `bson:"binance_symbol"`
	}{}
	if err := bson.Unmarshal(data, &aux); err != nil {
		return err
	}
	*m = TokenMeta(aux.alias)
	if m.BnSymbol == "" {
		m.BnSymbol = aux.BinanceSymbol
	}
	return nil
}

func DefaultETHTokenMeta() *TokenMeta {
	return &TokenMeta{
		ID:            KlineRowKey("eth", "eth"),
		Chain:         "eth",
		Token:         "eth",
		Symbol:        "ETH",
		BnSymbol:      "ETHUSDT",
		Decimals:      18,
		IsWhitelisted: true,
	}
}
