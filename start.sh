#!/bin/bash

echo "🚀 Starting Global Consular Collaboration Platform..."
echo ""

# Update backend .env with correct database URL
cd /home/user/IOMtest/backend
cat > .env << 'EOF'
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/consular_db
JWT_SECRET=consular-platform-super-secret-key-2024
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=consular-refresh-token-secret-2024
REFRESH_TOKEN_EXPIRES_IN=7d
ANTHROPIC_API_KEY=
CORS_ORIGIN=http://localhost:3000
EOF

echo "✅ Configuration updated"
echo ""
echo "📋 To complete setup, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd /home/user/IOMtest/backend && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd /home/user/IOMtest/frontend && npm start"
echo ""
echo "⚠️  Note: You need PostgreSQL running on localhost:5432"
echo "   Database: consular_db"
echo "   User: user"
echo "   Password: password"
echo ""
echo "📖 See QUICKSTART.md for PostgreSQL setup options"
