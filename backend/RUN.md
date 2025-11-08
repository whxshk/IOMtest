# Backend Run Instructions

## Quick Start

### From Codespaces or your terminal:

```bash
cd /workspaces/IOMtest/backend
npm start
```

That's it! The backend will start on port 5000.

## Alternative Commands

### Development mode (with auto-reload):
```bash
cd /workspaces/IOMtest/backend
npm run dev
```

### Using the startup script (handles PostgreSQL):
```bash
cd /workspaces/IOMtest/backend
./start.sh
```

### Direct node command:
```bash
cd /workspaces/IOMtest/backend
node src/index.js
```

## Important Notes

1. **You MUST be in the backend directory** (`/workspaces/IOMtest/backend`)
2. Dependencies should already be installed (node_modules exists)
3. PostgreSQL will be started automatically by the startup script
4. Backend runs on `http://localhost:5000`
5. Health check available at `http://localhost:5000/health`

## Troubleshooting

If you get "command not found" or "ENOENT" errors:
- Make sure you're IN the backend directory
- Run `pwd` to verify you're in `/workspaces/IOMtest/backend`
- Then run `npm start`
