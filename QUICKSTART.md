# Quick Start Guide - Codespace/Dev Container

## Option 1: Run Without Database (Demo Mode)

I'll create a simple demo mode that works without PostgreSQL.

## Option 2: Use Docker PostgreSQL (Recommended)

Run PostgreSQL in a Docker container:

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name consular-postgres \
  -e POSTGRES_DB=consular_db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:13

# Wait for it to start
sleep 5

# Run schema
docker exec -i consular-postgres psql -U user -d consular_db < database/schema.sql

# Run seed data
docker exec -i consular-postgres psql -U user -d consular_db < database/seed_data.sql
```

Then update `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/consular_db
```

## Option 3: Run Existing PostgreSQL

If PostgreSQL is already installed:

```bash
# Check PostgreSQL status
service postgresql status

# Start if needed
service postgresql start

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE consular_db;"
sudo -u postgres psql -c "CREATE USER consular WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE consular_db TO consular;"

# Run schema and seed
psql -U consular -d consular_db -f database/schema.sql
psql -U consular -d consular_db -f database/seed_data.sql
```

Update `.env`:
```
DATABASE_URL=postgresql://consular:password@localhost:5432/consular_db
```

## Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The app will open at http://localhost:3000
