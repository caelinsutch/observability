-- Rollback: Initial schema setup
-- Drops all observability tables

DROP TABLE IF EXISTS observability.logs;
DROP TABLE IF EXISTS observability.metrics;
DROP TABLE IF EXISTS observability.events;