package bnkline

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/peterlee/true-social/backend/internal/model"
	"github.com/peterlee/true-social/backend/pkg/binance"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (w *BNKLineSubWorker) startBackfillLoop() {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		w.runBackfill(w.ctx)
		for {
			select {
			case <-w.ctx.Done():
				return
			case <-ticker.C:
				w.runBackfill(w.ctx)
			}
		}
	}()
}

func (w *BNKLineSubWorker) runBackfill(ctx context.Context) {
	for _, sub := range w.snapshotSubscriptions() {
		if err := w.backfillToken(ctx, sub.rowKey, sub.binanceSymbol, w.options.BackfillLookback()); err != nil && ctx.Err() == nil {
			log.Printf("[%s] backfill failed row_key=%s symbol=%s: %v", w.GetName(), sub.rowKey, sub.binanceSymbol, err)
		}
	}
}

func (w *BNKLineSubWorker) backfillToken(ctx context.Context, rowKey, symbol string, lookback time.Duration) error {
	if err := w.limiter.Wait(ctx); err != nil {
		return err
	}
	now := time.Now().UTC().Truncate(time.Minute)
	start := now.Add(-lookback).UnixMilli()
	end := now.Add(-time.Second).UnixMilli()
	items, err := w.bn.GetKlines(ctx, symbol, w.dataCfg.Interval, start, end, 1000)
	if err != nil {
		return err
	}
	for _, k := range items {
		if !k.IsFinal {
			continue
		}
		value := redisValueFromKline(k)
		if err := w.asset.SetClosedLatestKline(ctx, rowKey, value); err != nil {
			return err
		}
		doc, err := mongoKlineFromBinance(rowKey, k)
		if err != nil {
			return err
		}
		if err := w.asset.UpsertKline(ctx, doc); err != nil {
			return err
		}
	}
	if len(items) > 0 {
		log.Printf("[%s] backfill upserted rows row_key=%s count=%d", w.GetName(), rowKey, len(items))
	}
	return nil
}

func mongoKlineFromBinance(rowKey string, k binance.Kline) (*model.KlineData, error) {
	chain, token := splitRowKey(rowKey)
	minuteTS := k.OpenTime / 1000
	closePrice, err := primitive.ParseDecimal128(k.Close)
	if err != nil {
		return nil, err
	}
	return &model.KlineData{
		ID:       model.KlineMinuteID(rowKey, minuteTS),
		Chain:    chain,
		Token:    token,
		MinuteTS: minuteTS,
		PriceUSD: closePrice,
		Source:   "bn",
	}, nil
}

func splitRowKey(rowKey string) (string, string) {
	parts := strings.Split(rowKey, "#")
	if len(parts) < 2 {
		return "", rowKey
	}
	return parts[0], parts[1]
}
