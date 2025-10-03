# Developer's Guide

## Protein Structure Analysis - Project Structure

## Frontend Development (zqjd77)

- Edit UI and scripts directly in `zqjd77/` (e.g., `scripts/`, `components/`, `styles/`).
- Open `zqjd77/index.html` in your browser (or view via the backend if served).
- Save and refresh the page — changes are applied instantly; no build step required.

## Backend Server Development (server)

- Start or restart the server using the startup script:

```bash
cd /data/zqjd/server
./start.sh
```

- The script stops any existing instance (kill included) and starts a fresh one.
- Backend code changes take effect after you rerun `./start.sh`.

## Tools Development (containers)
- All tools are implemented as Docker containers to ensure consistent, isolated execution and communication across environments.
- The server communicates with these containers via stable interfaces (files/stdin/stdout and HTTP where applicable), ensuring predictable behavior.

## Prerequisites

- Node.js >= 14 and npm
- Docker engine configured and running
- Port `3002` available (default server port)

## Quick Start

```bash
# 1) Start the backend
cd /data/zqjd/server
./start.sh

# 2) Open the frontend
# Open /data/zqjd/zqjd77/index.html in a browser

# 3) Verify health
curl http://localhost:3002/api/health
```

Key endpoints:
- Health: `GET /api/health`
- Upload: `POST /api/upload`
- Run tool: `POST /api/run-tool`
- Jobs: `GET /api/jobs`

## Using PM2 (optional but recommended)
- Use the start script (auto-detects PM2 and uses it if available):

```bash
cd /data/zqjd/server
./start.sh
```
- Or, start with PM2 directly:

```bash
cd /data/zqjd
pm2 start ecosystem.config.js
pm2 save
```

Common PM2 commands:
- `pm2 status`
- `pm2 logs protein-tools-server`
- `pm2 restart protein-tools-server`

## Logs and Monitoring

- Central logs are written to `logs/` at the repo root when using PM2:
  - `logs/out.log`, `logs/err.log`, `logs/combined.log`
- When running without PM2, logs appear in the terminal running `npm start`.
- Health check: `curl http://localhost:3002/api/health`

## Troubleshooting

- Port 3002 in use: `lsof -i :3002` to find and stop the process.
- Dependencies missing: run `npm install` in `/data/zqjd/server`.
- Docker issues: ensure Docker is running and your user can run `docker`.
- After code changes, restart backend with `./start.sh` to apply updates.

- All tools are implemented as Docker containers to ensure consistent, isolated execution and communication across environments.
- The server communicates with these containers via stable interfaces (files/stdin/stdout and HTTP where applicable), ensuring predictable behavior.