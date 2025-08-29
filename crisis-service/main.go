package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthResponse struct {
    Status    string    `json:"status"`
    Service   string    `json:"service"`
    Timestamp time.Time `json:"timestamp"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{
        Status:    "healthy",
        Service:   "crisis",
        Timestamp: time.Now(),
    })
}

func main() {
    http.HandleFunc("/health", healthHandler)
    println("Crisis service running on port 8080")
    http.ListenAndServe(":8080", nil)
}
