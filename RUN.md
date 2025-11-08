# 🚀 Quick Start Guide

## SINGLE PORT SETUP (Recommended for Codespaces)

Everything runs on **PORT 5000** - both frontend and backend!

### Quick Start (One Command):
```bash
./build-and-run.sh
```

This will:
1. Start PostgreSQL
2. Build the React frontend
3. Start backend (which serves the frontend)
4. Open **http://localhost:5000** to access everything

---

## Alternative: Two-Port Setup (Development)

**Terminal 1 - Start Backend:**
```bash
# Ensure PostgreSQL is running
service postgresql start

# Start backend
cd backend
npm start
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
```

---

## Login Credentials

**Admin:** `admin@consular-platform.org` / `Admin123`

**Staff:** `john.smith@usembassy.gov` / `Admin123`

**Citizen:** `michael.j@example.com` / `Admin123`

---

## Troubleshooting

### Backend won't start (Database connection error)

PostgreSQL stopped. Restart it:
```bash
/etc/init.d/postgresql start
```

Then try running the backend again:
```bash
cd /workspaces/IOMtest/backend
npm run dev
```

### Port already in use

Kill the process:
```bash
# For backend (port 5000)
lsof -ti:5000 | xargs kill -9

# For frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

---

## URLs

### Single Port Setup:
- Everything: http://localhost:5000
- API Health: http://localhost:5000/health
- API Docs: http://localhost:5000/api/v1

### Two Port Setup:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/health
