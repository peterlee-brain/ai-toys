package worker

import (
	"context"
	"log"
)

type SubWorker interface {
	Start()
	Stop()
	GetName() string
}

type Worker struct {
	workers []SubWorker
}

func NewWorker() *Worker {
	return &Worker{}
}

func (w *Worker) Register(subworker SubWorker) {
	if subworker == nil {
		return
	}
	w.workers = append(w.workers, subworker)
}

func (w *Worker) Start(ctx context.Context) error {
	log.Printf("[Worker] starting workers: %d", len(w.workers))
	for _, sub := range w.workers {
		log.Printf("[Worker] starting %s", sub.GetName())
		sub.Start()
	}
	return nil
}

func (w *Worker) Stop(ctx context.Context) error {
	log.Printf("[Worker] stopping")
	for _, sub := range w.workers {
		log.Printf("[Worker] stopping %s", sub.GetName())
		sub.Stop()
	}
	return nil
}
