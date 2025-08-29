package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"serenity/crisis-service/internal/database"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	redisClient    *database.RedisClient
	postgresClient *database.PostgresClient
	logger         *logrus.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(redisClient *database.RedisClient, postgresClient *database.PostgresClient, logger *logrus.Logger) *HealthHandler {
	return &HealthHandler{
		redisClient:    redisClient,
		postgresClient: postgresClient,
		logger:         logger,
	}
}

// HealthCheck provides basic health check
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "serenity-crisis-service",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// ReadinessCheck checks if the service is ready to receive traffic
func (h *HealthHandler) ReadinessCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	checks := make(map[string]string)
	allHealthy := true
	
	// Check Redis connection
	if err := h.redisClient.HealthCheck(ctx); err != nil {
		checks["redis"] = "unhealthy"
		allHealthy = false
		h.logger.WithError(err).Error("Redis health check failed")
	} else {
		checks["redis"] = "healthy"
	}
	
	// Check PostgreSQL connection
	if err := h.postgresClient.HealthCheck(); err != nil {
		checks["postgres"] = "unhealthy"
		allHealthy = false
		h.logger.WithError(err).Error("PostgreSQL health check failed")
	} else {
		checks["postgres"] = "healthy"
	}
	
	status := "ready"
	httpStatus := http.StatusOK
	
	if !allHealthy {
		status = "not ready"
		httpStatus = http.StatusServiceUnavailable
	}
	
	c.JSON(httpStatus, gin.H{
		"status":    status,
		"checks":    checks,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// LivenessCheck checks if the service is alive
func (h *HealthHandler) LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}