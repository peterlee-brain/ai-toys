package bnkline

import (
	"context"
	"log"
	"time"
)

func (w *BNKLineSubWorker) startSentinelLoop() {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(w.options.SentinelDuration())
		defer ticker.Stop()
		for {
			select {
			case <-w.ctx.Done():
				return
			case <-ticker.C:
				w.runSentinel(w.ctx)
			}
		}
	}()
}

func (w *BNKLineSubWorker) runSentinel(ctx context.Context) {
	for _, sub := range w.snapshotSubscriptions() {
		if err := w.sentinelToken(ctx, sub.rowKey, sub.binanceSymbol); err != nil && ctx.Err() == nil {
			log.Printf("[%s] sentinel failed row_key=%s symbol=%s: %v", w.GetName(), sub.rowKey, sub.binanceSymbol, err)
		}
	}
}

func (w *BNKLineSubWorker) sentinelToken(ctx context.Context, rowKey, symbol string) error {
	if err := w.limiter.Wait(ctx); err != nil {
		return err
	}
	items, err := w.bn.GetKlines(ctx, symbol, w.dataCfg.Interval, 0, 0, w.dataCfg.SentinelLimit)
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
	return nil
}

func (w *BNKLineSubWorker) startTokenMetaLoop() {
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(w.options.TokenMetaPollDuration())
		defer ticker.Stop()
		for {
			select {
			case <-w.ctx.Done():
				return
			case <-ticker.C:
				if err := w.syncSubscriptions(w.ctx); err != nil && w.ctx.Err() == nil {
					log.Printf("[%s] token_meta sync failed: %v", w.GetName(), err)
				}
			}
		}
	}()
}
