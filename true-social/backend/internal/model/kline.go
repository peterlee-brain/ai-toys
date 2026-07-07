package model

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// KlineData 对应 Mongo token_price_minute 文档（仅已闭合分钟）。
type KlineData struct {
	ID       string               `bson:"_id" json:"id"`
	Chain    string               `bson:"chain" json:"chain"`
	Token    string               `bson:"token" json:"token"`
	MinuteTS int64                `bson:"minute_ts" json:"minute_ts"`
	PriceUSD primitive.Decimal128 `bson:"price_usd" json:"price_usd"`
	Source   string               `bson:"source" json:"source"`
	CT       time.Time            `bson:"ct" json:"ct"`
	UT       time.Time            `bson:"ut" json:"ut"`
}

func KlineMinuteID(rowKey string, minuteTS int64) string {
	return fmt.Sprintf("%s#%d", rowKey, minuteTS)
}

type RedisKlineValue struct {
	Last      string `json:"last"`
	OpenTS    string `json:"open_ts"`
	CloseTS   string `json:"close_ts,omitempty"`
	Open      string `json:"o"`
	High      string `json:"h"`
	Low       string `json:"l"`
	IsFinal   string `json:"is_final"`
	Interval  string `json:"interval"`
	Symbol    string `json:"symbol"`
	UpdatedTS string `json:"updated_ts"`
}
