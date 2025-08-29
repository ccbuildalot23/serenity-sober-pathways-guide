package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
	"serenity/crisis-service/config"
)

type PostgresClient struct {
	db     *sql.DB
	config *config.DatabaseConfig
	logger *logrus.Logger
}

// NewPostgresClient creates a new PostgreSQL client
func NewPostgresClient(cfg *config.DatabaseConfig, logger *logrus.Logger) (*PostgresClient, error) {
	db, err := sql.Open("postgres", cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	client := &PostgresClient{
		db:     db,
		config: cfg,
		logger: logger,
	}

	return client, nil
}

// RunMigrations runs database migrations
func (p *PostgresClient) RunMigrations() error {
	driver, err := postgres.WithInstance(p.db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", p.config.MigrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	p.logger.Info("Database migrations completed successfully")
	return nil
}

// Health check
func (p *PostgresClient) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return p.db.PingContext(ctx)
}

// Close closes the database connection
func (p *PostgresClient) Close() error {
	return p.db.Close()
}

// GetDB returns the underlying database connection
func (p *PostgresClient) GetDB() *sql.DB {
	return p.db
}