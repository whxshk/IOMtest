#!/bin/bash

echo "========================================="
echo "Global Consular Platform - Single Port Setup"
echo "========================================="
echo ""

# Start PostgreSQL
echo "Starting PostgreSQL..."
service postgresql start || /etc/init.d/postgresql start
sleep 2

if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL running on port 5432"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

# Start Backend
echo ""
echo "Starting Backend on port 5000..."
cd /home/user/IOMtest/backend
npm start &
BACKEND_PID=$!
sleep 3

# Check if backend started
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend running on port 5000"
else
    echo "⏳ Backend starting..."
fi

# Start Frontend with proxy to backend
echo ""
echo "Starting Frontend on port 3000..."
cd /home/user/IOMtest/frontend

# Set backend URL
export REACT_APP_API_URL=http://localhost:5000

npm start &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "Services Starting:"
echo "========================================="
echo "Backend API:  http://localhost:5000"
echo "Frontend:     http://localhost:3000"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
