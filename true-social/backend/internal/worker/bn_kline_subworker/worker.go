package bnkline

import (
	"context"
	"log"
	"sync"

	"github.com/peterlee/true-social/backend/internal/biz"
	"github.com/peterlee/true-social/backend/internal/conf"
	"github.com/peterlee/true-social/backend/pkg/binance"
)

type BNKLineSubWorker struct {
	options *conf.ServerBNKlineWorkerOption
	dataCfg *conf.DataBinance
	asset   *biz.AssetUsecase
	bn      *binance.Client
	limiter *limiter

	mu      sync.Mutex
	running map[string]*subscription
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
}

type subscription struct {
	rowKey        string
	binanceSymbol string
	cancel        context.CancelFunc
}

func NewBNKLineSubWorker(server *conf.Server, data *conf.Data, asset *biz.AssetUsecase) *BNKLineSubWorker {
	if server.Worker == nil || server.Worker.BNKlineSubworker == nil {
		return nil
	}
	return &BNKLineSubWorker{
		options: server.Worker.BNKlineSubworker,
		dataCfg: data.Binance,
		asset:   asset,
		bn:      binance.NewClient(data.Binance),
		limiter: newLimiter(data.Binance.RestLimitPerMin),
		running: make(map[string]*subscription),
	}
}

func (w *BNKLineSubWorker) GetName() string {
	return "bn_kline_subworker"
}

func (w *BNKLineSubWorker) Start() {
	if w == nil {
		return
	}
	w.ctx, w.cancel = context.WithCancel(context.Background())
	log.Printf("[%s] starting", w.GetName())

	if err := w.asset.EnsureIndexes(w.ctx); err != nil {
		log.Printf("[%s] ensure indexes: %v", w.GetName(), err)
	}
	if w.options.SeedDefaultSymbol {
		if err := w.asset.EnsureDefaultTokenMeta(w.ctx); err != nil {
			log.Printf("[%s] seed default token meta: %v", w.GetName(), err)
		}
	}
	if err := w.syncSubscriptions(w.ctx); err != nil {
		log.Printf("[%s] sync subscriptions: %v", w.GetName(), err)
	}
	w.startBackfillLoop()
	w.startSentinelLoop()
	w.startTokenMetaLoop()
}

func (w *BNKLineSubWorker) Stop() {
	if w == nil {
		return
	}
	log.Printf("[%s] stopping", w.GetName())
	if w.cancel != nil {
		w.cancel()
	}
	w.mu.Lock()
	for rowKey, sub := range w.running {
		sub.cancel()
		delete(w.running, rowKey)
	}
	w.mu.Unlock()
	w.wg.Wait()
	log.Printf("[%s] stopped", w.GetName())
}
