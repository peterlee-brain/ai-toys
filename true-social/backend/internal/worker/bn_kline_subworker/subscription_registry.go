package bnkline

import (
	"context"
	"log"

	"github.com/peterlee/true-social/backend/internal/model"
)

func (w *BNKLineSubWorker) syncSubscriptions(ctx context.Context) error {
	items, err := w.asset.ListWhitelistedTokenMeta(ctx)
	if err != nil {
		return err
	}
	desired := make(map[string]*model.TokenMeta, len(items))
	for _, item := range items {
		if item.ID == "" {
			item.ID = model.KlineRowKey(item.Chain, item.Token)
		}
		if item.BnSymbol == "" {
			log.Printf("[%s] skip token meta without bn_symbol: %s", w.GetName(), item.ID)
			continue
		}
		desired[item.ID] = item
	}

	w.mu.Lock()
	for rowKey, sub := range w.running {
		if _, ok := desired[rowKey]; !ok {
			log.Printf("[%s] remove subscription row_key=%s symbol=%s", w.GetName(), rowKey, sub.binanceSymbol)
			sub.cancel()
			delete(w.running, rowKey)
			go func(rowKey string) {
				if err := w.asset.DeleteKlineCache(context.Background(), rowKey); err != nil {
					log.Printf("[%s] delete kline cache: %v", w.GetName(), err)
				}
			}(rowKey)
		}
	}
	w.mu.Unlock()

	for rowKey, item := range desired {
		w.mu.Lock()
		_, exists := w.running[rowKey]
		w.mu.Unlock()
		if exists {
			continue
		}
		w.addSubscription(rowKey, item.BnSymbol)
	}
	return nil
}

func (w *BNKLineSubWorker) addSubscription(rowKey, symbol string) {
	subCtx, cancel := context.WithCancel(w.ctx)
	w.mu.Lock()
	w.running[rowKey] = &subscription{rowKey: rowKey, binanceSymbol: symbol, cancel: cancel}
	w.mu.Unlock()

	log.Printf("[%s] add subscription row_key=%s symbol=%s", w.GetName(), rowKey, symbol)
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		w.watchLoop(subCtx, rowKey, symbol)
	}()

	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		if err := w.backfillToken(subCtx, rowKey, symbol, w.options.BackfillLookback()); err != nil && subCtx.Err() == nil {
			log.Printf("[%s] initial backfill failed row_key=%s: %v", w.GetName(), rowKey, err)
		}
	}()
}

func (w *BNKLineSubWorker) snapshotSubscriptions() []subscription {
	w.mu.Lock()
	defer w.mu.Unlock()
	out := make([]subscription, 0, len(w.running))
	for _, sub := range w.running {
		out = append(out, *sub)
	}
	return out
}
