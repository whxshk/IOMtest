#!/bin/bash

echo "🚀 Starting Consular Platform Backend..."
echo ""

# Start PostgreSQL if not running
if ! pg_isready > /dev/null 2>&1; then
    echo "📦 Starting PostgreSQL..."
    /etc/init.d/postgresql start
    sleep 2
    echo ""
fi

# Verify PostgreSQL is running
if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

echo "✅ Starting backend server..."
echo ""

# Start the backend
npm run dev
