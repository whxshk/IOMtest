# 🚀 START HERE - Complete Setup Guide

## ✅ BOTH FRONTEND AND BACKEND WORKING

### Step 1: Start the Backend

Run this command:
```bash
/etc/init.d/postgresql start && cd /home/user/IOMtest/backend && npm start
```

Or use the script:
```bash
./start-backend-simple.sh
```

**Expected output:**
```
✓ Database connected successfully
========================================
Global Consular Collaboration Platform
========================================
Server running on port 5000
```

Backend will run on: **http://localhost:5000**

---

### Step 2: Start the Frontend (in a NEW terminal)

Open a **new terminal** and run:
```bash
cd /home/user/IOMtest/frontend && npm start
```

**Expected output:**
```
Compiled successfully!
You can now view the app in your browser.
Local: http://localhost:3000
```

Frontend will run on: **http://localhost:3000**

---

## 🎯 Access the Application

1. Open your browser to: **http://localhost:3000**
2. You'll see the login page

**Login Credentials:**
- Email: `admin@consular-platform.org`
- Password: `Admin123`

Or try a citizen account:
- Email: `michael.j@example.com`
- Password: `Admin123`

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if PostgreSQL is running
pg_isready

# If not, start it:
/etc/init.d/postgresql start
```

### Frontend can't connect to backend
1. Make sure backend is running on port 5000
2. Check `/home/user/IOMtest/frontend/.env` has:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```
3. Restart the frontend after changing .env

### Ports in use
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

---

## 📊 Check Status

```bash
# Check what's running
lsof -i :3000 -i :5000

# Test backend health
curl http://localhost:5000/health
```

---

## 🎉 Quick Start (Copy/Paste)

**Terminal 1 (Backend):**
```bash
/etc/init.d/postgresql start && cd /home/user/IOMtest/backend && npm start
```

**Terminal 2 (Frontend):**
```bash
cd /home/user/IOMtest/frontend && npm start
```

Then open: **http://localhost:3000**
