#!/bin/bash

echo "========================================="
echo "Starting Consular Platform Backend"
echo "========================================="
echo ""

# Start PostgreSQL (works in Codespaces)
echo "1. Starting PostgreSQL..."
/etc/init.d/postgresql start

sleep 2

# Check if PostgreSQL is running
if pg_isready > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL running on port 5432"
else
    echo "   ❌ PostgreSQL failed to start"
    exit 1
fi

# Start Backend
echo ""
echo "2. Starting Backend..."
cd /home/user/IOMtest/backend
npm start

echo ""
echo "========================================="
echo "Backend Running!"
echo "========================================="
echo "Backend API: http://localhost:5000"
echo "Health Check: http://localhost:5000/health"
echo ""
echo "Login: admin@consular-platform.org / Admin123"
echo "========================================="
