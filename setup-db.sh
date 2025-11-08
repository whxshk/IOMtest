#!/bin/bash

echo "Setting up Global Consular Collaboration Platform..."

# Create necessary directories
mkdir -p /tmp/postgres-data

# Initialize PostgreSQL database
echo "Initializing PostgreSQL..."
initdb -D /tmp/postgres-data

# Start PostgreSQL server
echo "Starting PostgreSQL server..."
pg_ctl -D /tmp/postgres-data -l /tmp/postgres.log start

# Wait for server to start
sleep 3

# Create database
echo "Creating database..."
createdb consular_db

# Run schema
echo "Setting up database schema..."
psql -d consular_db -f database/schema.sql

# Run seed data
echo "Seeding database..."
psql -d consular_db -f database/seed_data.sql

echo "✅ Database setup complete!"
echo ""
echo "Database URL: postgresql://$(whoami)@localhost:5432/consular_db"
