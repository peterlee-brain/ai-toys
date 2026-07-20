package server

import (
	"github.com/peterlee/true-social/backend/internal/conf"
	"github.com/peterlee/true-social/backend/internal/worker"
	bnkline "github.com/peterlee/true-social/backend/internal/worker/bn_kline_subworker"
)

func NewWorkerServer(c *conf.Server, kline *bnkline.BNKLineSubWorker) *worker.Worker {
	w := worker.NewWorker()
	if c.Worker != nil && c.Worker.BNKlineSubworker != nil {
		w.Register(kline)
	}
	return w
}
