#!/bin/bash

echo "🚀 Starting Global Consular Collaboration Platform..."
echo ""

# Start PostgreSQL if not running
if ! pg_isready > /dev/null 2>&1; then
    echo "Starting PostgreSQL..."
    /etc/init.d/postgresql start
    sleep 2
else
    echo "✓ PostgreSQL is already running"
fi

# Navigate to backend directory
cd /workspaces/IOMtest/backend

echo ""
echo "✓ Starting backend API on port 5000..."
echo ""

# Start the backend
npm run dev
