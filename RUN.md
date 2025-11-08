# 🚀 Quick Start Guide

## Simple Way to Run (Recommended)

### Option 1: Run Backend (Easier)
```bash
./start-backend.sh
```

### Option 2: Manual Steps

**Terminal 1 - Start Backend:**
```bash
# Ensure PostgreSQL is running
/etc/init.d/postgresql start

# Start backend
cd /workspaces/IOMtest/backend
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd /workspaces/IOMtest/frontend
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

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/health
