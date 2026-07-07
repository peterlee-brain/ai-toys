package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/peterlee/true-social/backend/internal/biz"
	"github.com/peterlee/true-social/backend/internal/conf"
	"github.com/peterlee/true-social/backend/internal/data"
	"github.com/peterlee/true-social/backend/internal/server"
	bnkline "github.com/peterlee/true-social/backend/internal/worker/bn_kline_subworker"
)

var flagconf string

func init() {
	flag.StringVar(&flagconf, "conf", "configs/config.yaml", "config path, eg: -conf configs/config.yaml")
}

func main() {
	flag.Parse()

	cfg, err := conf.Load(flagconf)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	d, cleanup, err := data.NewData(ctx, cfg.Data)
	if err != nil {
		log.Fatalf("init data: %v", err)
	}
	defer cleanup(context.Background())

	asset := biz.NewAssetUsecase(d)
	klineWorker := bnkline.NewBNKLineSubWorker(cfg.Server, cfg.Data, asset)
	workerServer := server.NewWorkerServer(cfg.Server, klineWorker)
	httpServer := server.NewHTTPServer(cfg.Server)

	if err := workerServer.Start(ctx); err != nil {
		log.Fatalf("start worker: %v", err)
	}
	defer workerServer.Stop(context.Background())

	if err := httpServer.Start(ctx); err != nil {
		log.Fatalf("start http: %v", err)
	}
}
