package bnkline

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/peterlee/true-social/backend/internal/model"
	"github.com/peterlee/true-social/backend/pkg/binance"
)

func (w *BNKLineSubWorker) watchLoop(ctx context.Context, rowKey, symbol string) {
	backoff := time.Second
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		err := w.bn.WatchKline(ctx, symbol, w.dataCfg.Interval, func(k binance.Kline) {
			if err := w.handleKline(ctx, rowKey, k); err != nil {
				log.Printf("[%s] handle kline row_key=%s: %v", w.GetName(), rowKey, err)
			}
		})
		if ctx.Err() != nil {
			return
		}
		log.Printf("[%s] websocket disconnected row_key=%s symbol=%s error=%v", w.GetName(), rowKey, symbol, err)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if backoff < time.Minute {
			backoff *= 2
		}
	}
}

func (w *BNKLineSubWorker) handleKline(ctx context.Context, rowKey string, k binance.Kline) error {
	value := redisValueFromKline(k)
	if err := w.asset.SetLatestKline(ctx, rowKey, value); err != nil {
		return err
	}
	if !k.IsFinal {
		return nil
	}
	if err := w.asset.SetClosedLatestKline(ctx, rowKey, value); err != nil {
		return err
	}
	item, err := mongoKlineFromBinance(rowKey, k)
	if err != nil {
		return err
	}
	return w.asset.UpsertKline(ctx, item)
}

func redisValueFromKline(k binance.Kline) *model.RedisKlineValue {
	isFinal := "0"
	if k.IsFinal {
		isFinal = "1"
	}
	return &model.RedisKlineValue{
		Last:      k.Close,
		OpenTS:    strconv.FormatInt(k.OpenTime/1000, 10),
		CloseTS:   strconv.FormatInt(k.CloseTime/1000, 10),
		Open:      k.Open,
		High:      k.High,
		Low:       k.Low,
		IsFinal:   isFinal,
		Interval:  k.Interval,
		Symbol:    k.Symbol,
		UpdatedTS: strconv.FormatInt(k.EventTime/1000, 10),
	}
}
