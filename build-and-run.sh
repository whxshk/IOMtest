#!/bin/bash

echo "========================================="
echo "Building and Running Consular Platform"
echo "Single Port Setup (Port 5000)"
echo "========================================="
echo ""

# Start PostgreSQL
echo "1. Starting PostgreSQL..."
service postgresql start || /etc/init.d/postgresql start
sleep 2

if pg_isready > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL running"
else
    echo "   ❌ PostgreSQL failed to start"
    exit 1
fi

# Build Frontend
echo ""
echo "2. Building Frontend..."
cd /home/user/IOMtest/frontend
npm run build

if [ $? -eq 0 ]; then
    echo "   ✅ Frontend built successfully"
else
    echo "   ❌ Frontend build failed"
    exit 1
fi

# Start Backend (which serves the frontend)
echo ""
echo "3. Starting Backend (serving frontend)..."
cd /home/user/IOMtest/backend
npm start

echo ""
echo "========================================="
echo "Platform Running on Port 5000"
echo "========================================="
echo "Access at: http://localhost:5000"
echo "API Health: http://localhost:5000/health"
echo "========================================="
