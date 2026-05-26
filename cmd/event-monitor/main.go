package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"delivery-system/internal/monitor"
)

func main() {
	cfg := monitor.LoadConfig()
	store := monitor.NewStore()
	broker := monitor.NewBroker()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", corsMiddleware(healthHandler))
	mux.HandleFunc("/api/events", corsMiddleware(eventsHandler(store)))
	mux.HandleFunc("/api/events/stream", corsMiddleware(eventStreamHandler(broker)))

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 0,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	consumer, err := monitor.NewConsumer(cfg.Kafka, store, broker)
	if err != nil {
		log.Fatalf("failed to create monitor consumer: %v", err)
	}
	defer consumer.Close()

	go consumer.Start(ctx)

	log.Printf(
		"event monitor starting on %s, kafka brokers=%v, group_id=%s, topics=%v",
		server.Addr,
		cfg.Kafka.Brokers,
		cfg.Kafka.GroupID,
		[]string{cfg.Kafka.Topics.Orders, cfg.Kafka.Topics.Couriers, cfg.Kafka.Topics.Locations},
	)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("event monitor failed: %v", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("event monitor forced to shutdown: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "method not allowed",
		})
		return
	}

	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}

func eventsHandler(store *monitor.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
				"error": "method not allowed",
			})
			return
		}

		writeJSON(w, http.StatusOK, store.List())
	}
}

func eventStreamHandler(broker *monitor.Broker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
				"error": "method not allowed",
			})
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "streaming is not supported",
			})
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		events := broker.Subscribe()
		defer broker.Unsubscribe(events)

		if _, err := fmt.Fprint(w, ": connected\n\n"); err != nil {
			log.Printf("failed to write sse handshake: %v", err)
			return
		}
		flusher.Flush()

		heartbeat := time.NewTicker(15 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case <-r.Context().Done():
				return
			case <-heartbeat.C:
				if _, err := fmt.Fprint(w, ": heartbeat\n\n"); err != nil {
					log.Printf("failed to write sse heartbeat: %v", err)
					return
				}
				flusher.Flush()
			case event := <-events:
				data, err := json.Marshal(event)
				if err != nil {
					log.Printf("failed to marshal sse event: %v", err)
					continue
				}

				if _, err := fmt.Fprintf(w, "event: delivery-event\ndata: %s\n\n", data); err != nil {
					log.Printf("failed to write sse event: %v", err)
					return
				}
				flusher.Flush()
			}
		}
	}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, value interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("failed to write json response: %v", err)
	}
}
