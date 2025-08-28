package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	
	"serenity/crisis-service/config"
	"serenity/crisis-service/internal/database"
	"serenity/crisis-service/internal/crisis"
	"serenity/crisis-service/internal/escalation"
	"serenity/crisis-service/internal/location"
	"serenity/crisis-service/internal/notifications"
	"serenity/crisis-service/internal/websocket"
	"serenity/crisis-service/pkg/handlers"
	"serenity/crisis-service/pkg/middleware"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found")
	}
	
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logrus.WithError(err).Fatal("Failed to load configuration")
	}
	
	if err := cfg.Validate(); err != nil {
		logrus.WithError(err).Fatal("Invalid configuration")
	}
	
	// Initialize logger
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	
	level, err := logrus.ParseLevel(cfg.Monitoring.LogLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)
	
	logger.WithField("config", cfg).Info("Starting Serenity Crisis Service")
	
	// Initialize database connections
	postgresClient, err := database.NewPostgresClient(&cfg.Database, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize PostgreSQL client")
	}
	defer postgresClient.Close()
	
	// Run database migrations
	if err := postgresClient.RunMigrations(); err != nil {
		logger.WithError(err).Fatal("Failed to run database migrations")
	}
	
	// Initialize Redis client
	redisClient, err := database.NewRedisClient(&cfg.Redis, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize Redis client")
	}
	defer redisClient.Close()
	
	// Initialize services
	notificationService := notifications.NewService(cfg, logger)
	detectionService := crisis.NewDetectionService(redisClient, logger)
	escalationEngine := escalation.NewWorkflowEngine(redisClient, notificationService, logger)
	locationTracker := location.NewTrackerService(redisClient, logger)
	
	// Initialize WebSocket hub
	wsHub := websocket.NewHub(redisClient, logger)
	
	// Start WebSocket hub
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	go wsHub.Run(ctx)
	
	// Initialize HTTP server
	if cfg.Monitoring.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	router := gin.New()
	
	// Add middleware
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.Security.CORSAllowedOrigins))
	router.Use(middleware.RateLimit(cfg.Security.RateLimitRPS, cfg.Security.RateLimitBurst))
	router.Use(middleware.Security())
	router.Use(middleware.HIPAACompliance(logger))
	
	// Initialize handlers
	crisisHandlers := handlers.NewCrisisHandlers(
		detectionService,
		escalationEngine,
		locationTracker,
		wsHub,
		redisClient,
		postgresClient,
		logger,
	)
	
	healthHandler := handlers.NewHealthHandler(redisClient, postgresClient, logger)
	
	// Health check endpoints
	router.GET("/health", healthHandler.HealthCheck)
	router.GET("/health/ready", healthHandler.ReadinessCheck)
	router.GET("/health/live", healthHandler.LivenessCheck)
	
	// Metrics endpoint (if enabled)
	if cfg.Monitoring.MetricsEnabled {
		// In production, you'd use prometheus middleware
		router.GET(cfg.Monitoring.MetricsPath, func(c *gin.Context) {
			c.JSON(200, gin.H{
				"active_crises":      len(wsHub.GetActiveWorkflows()),
				"connected_clients":  wsHub.GetConnectedClients(),
				"active_sessions":    "TODO: get from location tracker",
			})
		})
	}
	
	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Crisis management endpoints
		crisisRoutes := v1.Group("/crisis")
		crisisRoutes.Use(middleware.AuthRequired()) // Add JWT auth middleware
		{
			crisisRoutes.POST("/trigger", crisisHandlers.TriggerCrisis)
			crisisRoutes.POST("/voice-analysis", crisisHandlers.AnalyzeVoice)
			crisisRoutes.POST("/pattern-analysis", crisisHandlers.AnalyzePatterns)
			crisisRoutes.GET("/:crisis_id", crisisHandlers.GetCrisis)
			crisisRoutes.PUT("/:crisis_id/status", crisisHandlers.UpdateCrisisStatus)
			crisisRoutes.POST("/:crisis_id/escalate", crisisHandlers.EscalateCrisis)
			crisisRoutes.GET("/:crisis_id/timeline", crisisHandlers.GetCrisisTimeline)
		}
		
		// Location tracking endpoints
		locationRoutes := v1.Group("/location")
		locationRoutes.Use(middleware.AuthRequired())
		{
			locationRoutes.POST("/start-tracking", crisisHandlers.StartLocationTracking)
			locationRoutes.PUT("/update", crisisHandlers.UpdateLocation)
			locationRoutes.DELETE("/stop-tracking/:session_id", crisisHandlers.StopLocationTracking)
			locationRoutes.GET("/sessions", crisisHandlers.GetLocationSessions)
		}
		
		// Emergency contacts endpoints
		contactsRoutes := v1.Group("/contacts")
		contactsRoutes.Use(middleware.AuthRequired())
		{
			contactsRoutes.GET("/", crisisHandlers.GetEmergencyContacts)
			contactsRoutes.POST("/", crisisHandlers.CreateEmergencyContact)
			contactsRoutes.PUT("/:contact_id", crisisHandlers.UpdateEmergencyContact)
			contactsRoutes.DELETE("/:contact_id", crisisHandlers.DeleteEmergencyContact)
			contactsRoutes.POST("/:contact_id/verify", crisisHandlers.VerifyEmergencyContact)
		}
		
		// Escalation plans endpoints
		escalationRoutes := v1.Group("/escalation-plans")
		escalationRoutes.Use(middleware.AuthRequired())
		{
			escalationRoutes.GET("/", crisisHandlers.GetEscalationPlans)
			escalationRoutes.POST("/", crisisHandlers.CreateEscalationPlan)
			escalationRoutes.PUT("/:plan_id", crisisHandlers.UpdateEscalationPlan)
			escalationRoutes.DELETE("/:plan_id", crisisHandlers.DeleteEscalationPlan)
			escalationRoutes.POST("/:plan_id/test", crisisHandlers.TestEscalationPlan)
		}
		
		// Emergency services integration endpoints
		emergencyRoutes := v1.Group("/emergency")
		emergencyRoutes.Use(middleware.AuthRequired())
		{
			emergencyRoutes.POST("/911", crisisHandlers.Contact911)
			emergencyRoutes.POST("/crisis-hotline", crisisHandlers.ContactCrisisHotline)
			emergencyRoutes.POST("/mental-health-services", crisisHandlers.ContactMentalHealthServices)
		}
		
		// Crisis intervention endpoints
		interventionRoutes := v1.Group("/intervention")
		interventionRoutes.Use(middleware.AuthRequired())
		{
			interventionRoutes.POST("/start", crisisHandlers.StartInterventionSession)
			interventionRoutes.PUT("/:session_id/step", crisisHandlers.UpdateInterventionStep)
			interventionRoutes.POST("/:session_id/complete", crisisHandlers.CompleteInterventionSession)
			interventionRoutes.GET("/:session_id", crisisHandlers.GetInterventionSession)
		}
		
		// Follow-up tasks endpoints
		followupRoutes := v1.Group("/followup")
		followupRoutes.Use(middleware.AuthRequired())
		{
			followupRoutes.GET("/tasks", crisisHandlers.GetFollowupTasks)
			followupRoutes.POST("/tasks", crisisHandlers.CreateFollowupTask)
			followupRoutes.PUT("/tasks/:task_id", crisisHandlers.UpdateFollowupTask)
			followupRoutes.POST("/tasks/:task_id/complete", crisisHandlers.CompleteFollowupTask)
		}
	}
	
	// WebSocket endpoint
	router.GET("/ws", func(c *gin.Context) {
		// Extract user info from JWT token (implement JWT middleware first)
		userID := c.GetString("user_id")
		sessionID := c.GetString("session_id")
		
		if userID == "" {
			c.JSON(401, gin.H{"error": "authentication required"})
			return
		}
		
		websocket.ServeWS(wsHub, c.Writer, c.Request, userID, sessionID)
	})
	
	// Webhook endpoints for external services
	webhookRoutes := router.Group("/webhooks")
	{
		webhookRoutes.POST("/twilio/voice", crisisHandlers.HandleTwilioVoiceWebhook)
		webhookRoutes.POST("/twilio/sms", crisisHandlers.HandleTwilioSMSWebhook)
		webhookRoutes.POST("/emergency-services", crisisHandlers.HandleEmergencyServicesWebhook)
	}
	
	// Start HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}
	
	// Start server in goroutine
	go func() {
		logger.WithField("addr", server.Addr).Info("Starting HTTP server")
		
		var err error
		if cfg.Server.TLSEnabled {
			err = server.ListenAndServeTLS(cfg.Server.CertFile, cfg.Server.KeyFile)
		} else {
			err = server.ListenAndServe()
		}
		
		if err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Failed to start HTTP server")
		}
	}()
	
	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	logger.Info("Shutting down server...")
	
	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer shutdownCancel()
	
	// Shutdown escalation engine
	if err := escalationEngine.Shutdown(shutdownCtx); err != nil {
		logger.WithError(err).Error("Error shutting down escalation engine")
	}
	
	// Shutdown WebSocket hub
	wsHub.Shutdown()
	
	// Shutdown HTTP server
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.WithError(err).Error("Error shutting down HTTP server")
	}
	
	// Cancel main context
	cancel()
	
	logger.Info("Server shut down complete")
}