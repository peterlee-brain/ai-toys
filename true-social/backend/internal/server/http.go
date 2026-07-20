package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/peterlee/true-social/backend/internal/conf"
)

type HTTPServer struct {
	server *http.Server
}

func NewHTTPServer(c *conf.Server) *HTTPServer {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	addr := "0.0.0.0:8080"
	if c.HTTP != nil && c.HTTP.Addr != "" {
		addr = c.HTTP.Addr
	}
	return &HTTPServer{
		server: &http.Server{
			Addr:              addr,
			Handler:           mux,
			ReadHeaderTimeout: c.HTTP.TimeoutDuration(),
		},
	}
}

func (s *HTTPServer) Start(ctx context.Context) error {
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := s.server.Shutdown(shutdownCtx); err != nil {
			log.Printf("[HTTP] shutdown: %v", err)
		}
	}()
	log.Printf("[HTTP] listening on %s", s.server.Addr)
	if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}
