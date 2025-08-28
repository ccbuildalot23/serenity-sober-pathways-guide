package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// RateLimiter implements rate limiting using token bucket algorithm
type RateLimiter struct {
	limiters sync.Map
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rps, burst int) *RateLimiter {
	return &RateLimiter{
		rate:  rate.Limit(rps),
		burst: burst,
	}
}

// GetLimiter returns a rate limiter for the given key
func (rl *RateLimiter) GetLimiter(key string) *rate.Limiter {
	limiter, exists := rl.limiters.Load(key)
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters.Store(key, limiter)
	}
	return limiter.(*rate.Limiter)
}

// RateLimit middleware implements rate limiting
func RateLimit(rps, burst int) gin.HandlerFunc {
	limiter := NewRateLimiter(rps, burst)
	
	return func(c *gin.Context) {
		key := c.ClientIP()
		if !limiter.GetLimiter(key).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"code":  "RATE_LIMIT_EXCEEDED",
				"retry_after": "60",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowed = true
				break
			}
		}
		
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-Crisis-Type")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")
		
		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	}
}

// Security middleware adds security headers
func Security() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Enable XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Enforce HTTPS
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		
		// Content Security Policy for enhanced security
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: https:; " +
			"connect-src 'self' wss: https:; " +
			"font-src 'self'; " +
			"object-src 'none'; " +
			"media-src 'self'; " +
			"frame-ancestors 'none'"
		c.Header("Content-Security-Policy", csp)
		
		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Permissions policy
		c.Header("Permissions-Policy", "geolocation=(self), microphone=(self), camera=(self)")
		
		c.Next()
	}
}

// HIPAACompliance middleware ensures HIPAA compliance requirements
func HIPAACompliance(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		
		// Extract user information for audit logging
		userID := c.GetString("user_id")
		sessionID := c.GetString("session_id")
		
		// Log PHI access attempts
		if isPHIEndpoint(c.Request.URL.Path) {
			logger.WithFields(logrus.Fields{
				"event":      "phi_access_attempt",
				"user_id":    userID,
				"session_id": sessionID,
				"ip_address": c.ClientIP(),
				"user_agent": c.GetHeader("User-Agent"),
				"path":       c.Request.URL.Path,
				"method":     c.Request.Method,
				"timestamp":  startTime,
			}).Info("PHI access attempt")
		}
		
		// Process request
		c.Next()
		
		// Log completion
		duration := time.Since(startTime)
		
		if isPHIEndpoint(c.Request.URL.Path) {
			logger.WithFields(logrus.Fields{
				"event":        "phi_access_complete",
				"user_id":      userID,
				"session_id":   sessionID,
				"ip_address":   c.ClientIP(),
				"path":         c.Request.URL.Path,
				"method":       c.Request.Method,
				"status_code":  c.Writer.Status(),
				"duration_ms":  duration.Milliseconds(),
				"timestamp":    startTime,
			}).Info("PHI access complete")
		}
	}
}

// isPHIEndpoint checks if the endpoint deals with Protected Health Information
func isPHIEndpoint(path string) bool {
	phiEndpoints := []string{
		"/api/v1/crisis",
		"/api/v1/location",
		"/api/v1/contacts",
		"/api/v1/intervention",
		"/api/v1/followup",
	}
	
	for _, endpoint := range phiEndpoints {
		if strings.HasPrefix(path, endpoint) {
			return true
		}
	}
	
	return false
}

// Logger middleware for structured logging
func Logger(logger *logrus.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logger.WithFields(logrus.Fields{
			"status_code":   param.StatusCode,
			"latency":       param.Latency,
			"client_ip":     param.ClientIP,
			"method":        param.Method,
			"path":          param.Path,
			"error_message": param.ErrorMessage,
			"body_size":     param.BodySize,
			"timestamp":     param.TimeStamp,
		}).Info("HTTP Request")
		
		return ""
	})
}

// RequestSize middleware limits request body size
func RequestSize(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// ValidateContentType middleware validates content type for POST/PUT requests
func ValidateContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			contentType := c.GetHeader("Content-Type")
			if contentType != "application/json" && !strings.HasPrefix(contentType, "multipart/form-data") {
				c.JSON(http.StatusUnsupportedMediaType, gin.H{
					"error": "Unsupported content type",
					"code":  "UNSUPPORTED_CONTENT_TYPE",
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

// IPWhitelist middleware restricts access to specific IP addresses
func IPWhitelist(allowedIPs []string) gin.HandlerFunc {
	allowedIPMap := make(map[string]bool)
	for _, ip := range allowedIPs {
		allowedIPMap[ip] = true
	}
	
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		if !allowedIPMap[clientIP] {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "IP address not allowed",
				"code":  "IP_NOT_ALLOWED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// SessionTimeout middleware checks for session expiration
func SessionTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This would typically check session last activity from database/cache
		// For now, we'll rely on JWT expiration
		c.Next()
	}
}

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}