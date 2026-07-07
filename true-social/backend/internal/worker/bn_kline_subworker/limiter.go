package bnkline

import (
	"context"
	"time"
)

type limiter struct {
	tick <-chan time.Time
}

func newLimiter(limitPerMinute int) *limiter {
	if limitPerMinute <= 0 {
		limitPerMinute = 1000
	}
	interval := time.Minute / time.Duration(limitPerMinute)
	if interval < time.Millisecond {
		interval = time.Millisecond
	}
	return &limiter{tick: time.Tick(interval)}
}

func (l *limiter) Wait(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-l.tick:
		return nil
	}
}
