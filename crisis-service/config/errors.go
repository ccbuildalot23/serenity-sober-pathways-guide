package config

import "errors"

var (
	ErrInvalidPort                = errors.New("invalid port number")
	ErrInvalidConsensusNodes      = errors.New("consensus nodes must be odd and positive")
	ErrInvalidConfidenceThreshold = errors.New("confidence threshold must be between 0 and 1")
	ErrMissingRequiredConfig      = errors.New("missing required configuration")
	ErrInvalidDatabaseURL         = errors.New("invalid database URL")
	ErrInvalidRedisURL            = errors.New("invalid redis URL")
)