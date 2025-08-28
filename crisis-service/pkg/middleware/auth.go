package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// JWTClaims represents JWT claims structure
type JWTClaims struct {
	UserID    string   `json:"user_id"`
	Email     string   `json:"email"`
	Roles     []string `json:"roles"`
	SessionID string   `json:"session_id"`
	jwt.StandardClaims
}

// AuthRequired middleware validates JWT tokens
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := extractToken(c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		claims, err := validateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
				"code":  "INVALID_TOKEN",
			})
			c.Abort()
			return
		}

		// Store claims in context
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)
		c.Set("session_id", claims.SessionID)
		c.Set("claims", claims)

		c.Next()
	}
}

// RoleRequired middleware checks for specific roles
func RoleRequired(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles, exists := c.Get("roles")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Access denied",
				"code":  "ACCESS_DENIED",
			})
			c.Abort()
			return
		}

		roles := userRoles.([]string)
		if !hasRequiredRole(roles, requiredRoles) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"code":  "INSUFFICIENT_PERMISSIONS",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractToken extracts JWT token from request
func extractToken(r *http.Request) (string, error) {
	// Check Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1], nil
		}
	}

	// Check query parameter
	token := r.URL.Query().Get("token")
	if token != "" {
		return token, nil
	}

	// Check cookie
	cookie, err := r.Cookie("auth_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value, nil
	}

	return "", fmt.Errorf("no token found")
}

// validateToken validates JWT token and returns claims
func validateToken(tokenString string) (*JWTClaims, error) {
	// In production, get this from config
	jwtSecret := []byte("your-super-secret-jwt-key-change-in-production")

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		// Check if token is expired
		if claims.ExpiresAt < time.Now().Unix() {
			return nil, fmt.Errorf("token expired")
		}
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// hasRequiredRole checks if user has any of the required roles
func hasRequiredRole(userRoles, requiredRoles []string) bool {
	for _, required := range requiredRoles {
		for _, userRole := range userRoles {
			if userRole == required {
				return true
			}
		}
	}
	return false
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID, email, sessionID string, roles []string, expirationTime time.Duration) (string, error) {
	claims := &JWTClaims{
		UserID:    userID,
		Email:     email,
		Roles:     roles,
		SessionID: sessionID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(expirationTime).Unix(),
			IssuedAt:  time.Now().Unix(),
			Issuer:    "serenity-crisis-service",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	// In production, get this from config
	jwtSecret := []byte("your-super-secret-jwt-key-change-in-production")
	
	return token.SignedString(jwtSecret)
}

// RefreshToken refreshes an existing JWT token
func RefreshToken(tokenString string, expirationTime time.Duration) (string, error) {
	claims, err := validateToken(tokenString)
	if err != nil {
		return "", err
	}

	// Create new token with updated expiration
	return GenerateToken(claims.UserID, claims.Email, claims.SessionID, claims.Roles, expirationTime)
}

// LogAuthenticationAttempt logs authentication attempts for security monitoring
func LogAuthenticationAttempt(logger *logrus.Logger, c *gin.Context, success bool, userID string, reason string) {
	logger.WithFields(logrus.Fields{
		"event":         "authentication_attempt",
		"success":       success,
		"user_id":       userID,
		"ip_address":    c.ClientIP(),
		"user_agent":    c.GetHeader("User-Agent"),
		"reason":        reason,
		"timestamp":     time.Now(),
		"path":          c.Request.URL.Path,
		"method":        c.Request.Method,
	}).Info("Authentication attempt")
}