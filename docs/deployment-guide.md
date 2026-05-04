# Deployment Guide

Instructions for setting up Chess Composer in development, staging, and production environments.

**Latest Features (2026-04-18)**
- Preview button in lesson content editor (all content types)
- Rich content descriptions (markdown editor, download as HTML/markdown)
- Shared InteractivePuzzleBoard (chess.com-style dark theme, Chessground recreation fix)
- Multi-puzzle challenges in single content item (puzzle_challenges JSON array)
- Lesson puzzle player with per-move hints and auto-play
- PWA disabled in development (Vite HMR restored, conditional in production)
- Student registration feature (migration 011 - description column)

## Prerequisites

- **Node.js** v22+ (check: `node --version`)
- **npm** v10+ (check: `npm --version`)
- **Git** for version control
- **2GB disk space** for SQLite database
- **500MB RAM** for theme index (minimum)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### Optional
- **Docker** for containerization
- **Docker Compose** for multi-container setup
- **PostgreSQL** for production scaling (future)

## Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/chess-composer.git
cd chess-composer

npm install
```

### 2. Build SQLite Database

Choose one:

```bash
# Option A: Build full Lichess database (3.5M puzzles, takes 5-10 min)
npm run build:db

# Option B: Build test database (1000 puzzles, <30 seconds, for testing)
npm run build:db:test
```

Output: `packages/server/data/puzzles.db`

### 3. Configure Environment

Create `.env.local` in root:

```bash
# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-production

# Database (optional, defaults to ./packages/server/data/puzzles.db)
DATABASE_PATH=./packages/server/data/puzzles.db

# Logging
LOG_LEVEL=info
```

### 4. Start Development Servers

```bash
# Both client (3000) and server (3001) concurrently
npm run dev

# OR separately:
npm run dev:client    # Client only (Vite HMR)
npm run dev:server    # Server only (auto-reload)
```

### 5. Initialize Database

First server startup runs migrations automatically:

```
[Server] Running migrations...
[Server] ✓ 001_add_source_field.js
[Server] ✓ 002_add_exercise_tables.js
[Server] ✓ 003_add_puzzle_results.js
[Server] ✓ 004_add_users_auth.js
[Server] ✓ 005_add_puzzle_hints.js
[Server] ✓ 006_add_is_final_flag.js
[Server] Listening on port 3001
```

### 6. Create Admin User

On server startup, if no admin exists, console logs credentials:

```
[Server] Default admin created:
[Server] Username: admin
[Server] Password: admin (CHANGE THIS!)
```

**Change default password immediately:**

```bash
# Via UI: Login with admin/admin → User Management → Change Password
# OR via API:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Store returned tokens
```

### 7. Test Local Setup

```bash
# Check client loads
curl http://localhost:3000

# Check server health
curl http://localhost:3001/api/auth/me

# Check database
curl -X POST http://localhost:3001/api/puzzles/generate \
  -H "Content-Type: application/json" \
  -d '{"theme":"backRankMate","count":5}'
```

## Production Setup

### Option A: Node.js Direct

#### 1. Provision Server

**Minimum specs:**
- 2GB RAM
- 2 CPU cores
- 10GB disk (2GB database + OS + buffer)
- Ubuntu 22.04 LTS or similar

#### 2. Install Dependencies

```bash
# On server
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/your-org/chess-composer.git /opt/chess-composer
cd /opt/chess-composer

npm install --production
npm run build        # Client build
npm run build:db     # Database (takes 10-15 min first time)
```

#### 3. Configure Environment

Create `.env` in `/opt/chess-composer/`:

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)  # Generate random secret
DATABASE_PATH=/data/puzzles.db          # Persistent volume
LOG_LEVEL=warn
CORS_ORIGIN=https://chess-composer.yourdomain.com
```

**Store JWT_SECRET securely** (password manager, CI/CD secrets, etc.)

#### 4. Build Client for Production

```bash
npm run build
# Output: packages/client/dist/
```

#### 5. Setup Reverse Proxy (Nginx)

```bash
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/chess-composer`:

```nginx
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name chess-composer.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chess-composer.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/chess-composer.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chess-composer.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Static client files
    location / {
        root /opt/chess-composer/packages/client/dist;
        try_files $uri /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/chess-composer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d chess-composer.yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### 7. Setup Systemd Service

Create `/etc/systemd/system/chess-composer.service`:

```ini
[Unit]
Description=Chess Composer API
After=network.target

[Service]
Type=simple
User=chess-composer
WorkingDirectory=/opt/chess-composer
ExecStart=/usr/bin/node /opt/chess-composer/packages/server/src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables
EnvironmentFile=/opt/chess-composer/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo useradd -m -d /opt/chess-composer chess-composer
sudo chown -R chess-composer:chess-composer /opt/chess-composer

sudo systemctl daemon-reload
sudo systemctl enable chess-composer
sudo systemctl start chess-composer

# Check status
sudo systemctl status chess-composer
```

#### 8. Database Backup

Setup daily backup:

```bash
# Create backup script: /opt/chess-composer/backup.sh
#!/bin/bash
BACKUP_DIR="/backups/chess-composer"
mkdir -p $BACKUP_DIR
cp /data/puzzles.db $BACKUP_DIR/puzzles-$(date +%Y%m%d-%H%M%S).db
# Keep last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

Add to crontab:

```bash
sudo crontab -e

# Add line:
0 2 * * * /opt/chess-composer/backup.sh
```

---

### Option B: Docker (Recommended)

#### 1. Build Images

Create `Dockerfile`:

```dockerfile
# Multi-stage build for client
FROM node:22-alpine as client-builder
WORKDIR /app
COPY packages/client package.json ./
RUN npm install && npm run build

# Server image
FROM node:22-alpine
WORKDIR /app

# Install production dependencies
COPY packages/server/package.json ./
RUN npm install --production

# Copy built files
COPY packages/server ./
COPY --from=client-builder /app/dist ./public

# Create data directory
RUN mkdir -p /data

EXPOSE 3001
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/puzzles.db

CMD ["node", "src/index.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  chess-composer:
    build: .
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_PATH: /data/puzzles.db
      LOG_LEVEL: warn
    volumes:
      - chess-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/auth/me"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - chess-composer
    restart: unless-stopped

volumes:
  chess-data:
```

#### 2. Build Database

```bash
# Build image first
docker build -t chess-composer:latest .

# Run migration container to build database
docker run --rm \
  -v chess-data:/data \
  chess-composer:latest \
  node scripts/build-sqlite-db-optimized.js --output /data/puzzles.db
```

#### 3. Start Services

```bash
# Set JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Start
docker-compose up -d

# Check logs
docker-compose logs -f chess-composer
```

#### 4. Verify

```bash
curl http://localhost:3001/api/auth/me
```

---

## Production Checklist

Before deploying to production:

- [ ] JWT_SECRET set to secure random value
- [ ] NODE_ENV=production
- [ ] CORS_ORIGIN configured for your domain
- [ ] SSL/TLS certificates installed
- [ ] Database backed up (before first run, migrations auto-run)
- [ ] All 11 migrations verified (through 011_add_content_description.js)
- [ ] Admin user password changed from default
- [ ] Server firewall allows ports 80, 443
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] File upload storage configured (100MB max per file, writable)
- [ ] Learning materials directory backed up regularly
- [ ] Error logging configured
- [ ] Monitoring/alerting setup (optional)
- [ ] Auto-restart on crash configured
- [ ] Database file permissions restricted (644 or better)
- [ ] .env file secured (chmod 600)

## Monitoring & Maintenance

### Health Checks

```bash
# Check server is running
curl https://chess-composer.yourdomain.com/api/auth/me

# Check database
curl -X POST https://chess-composer.yourdomain.com/api/puzzles/generate \
  -H "Content-Type: application/json" \
  -d '{"theme":"backRankMate","count":1}'

# Check client loads
curl https://chess-composer.yourdomain.com
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 503 Service Unavailable | Server crashed | `systemctl restart chess-composer` |
| Database locked | Concurrent writes | Increase WAL timeout in SqliteDatabase.js |
| Slow puzzle generation | Unindexed queries | Run `npm run build:db` with indices |
| JWT token invalid | Secret changed | Update all sessions |
| Out of disk space | Database too large | Archive old results, increase disk |
| File upload fails | Disk full / permissions | Check `/uploads` directory writable |
| Lesson content missing | Migration 011 not run | Run `npm run dev` once (auto-migrates) |
| Content descriptions empty | Client-side rendering issue | Verify `safe-markdown.js` is loaded |

### Log Files

```bash
# Systemd service logs
sudo journalctl -u chess-composer -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Maintenance

```bash
# Vacuum database (optimize)
sqlite3 /data/puzzles.db "VACUUM;"

# Check integrity
sqlite3 /data/puzzles.db "PRAGMA integrity_check;"

# Backup
cp /data/puzzles.db /backups/puzzles-$(date +%Y%m%d).db
```

## Postgres Deployment

### When to use Postgres

SQLite is sufficient for <20 concurrent users. Switch to Postgres when:
- You need multiple app instances (read replicas, rolling deploys)
- Write concurrency exceeds SQLite's WAL limits
- You want managed backups via cloud Postgres (RDS, Cloud SQL, Supabase)

### 1. Provision Postgres

Any Postgres 14+ instance works. Recommended: managed cloud service with automated backups.

Create a dedicated database and user:

```sql
CREATE DATABASE chess_composer;
CREATE USER chess_user WITH ENCRYPTED PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE chess_composer TO chess_user;
```

### 2. Configure Environment

```bash
DATABASE_DRIVER=postgres
DATABASE_URL=postgres://chess_user:strongpassword@db.example.com:5432/chess_composer?sslmode=require
PG_POOL_MAX=10
```

Never commit `DATABASE_URL`. Use your platform's secret management:
- systemd: `EnvironmentFile=/etc/chess-composer/secrets.env` (chmod 600)
- Docker: `--env-file` or Docker secrets
- Kubernetes: `secretKeyRef` in pod spec

### 3. Run Schema Migrations

Migrations run automatically on server start. For zero-downtime first deploy,
run the migration CLI before switching traffic:

```bash
# Dry-run (no writes) to validate connectivity
DATABASE_URL=<prod_url> node packages/server/src/cli/migrate-to-postgres.js --dry-run

# If migrating data from an existing SQLite file:
SQLITE_PATH=/data/puzzles.db \
DATABASE_URL=<prod_url> \
  node packages/server/src/cli/migrate-to-postgres.js

# Verify row counts match before switching traffic
DATABASE_URL=<prod_url> node packages/server/src/cli/migrate-to-postgres.js --verify-only
```

Exit code 0 = counts match = safe to switch traffic.
Exit code 1 = count mismatch — investigate before switching.
Exit code 2 = connection/fatal error — check URL and firewall.

See `docs/database-driver.md` for full CLI reference and troubleshooting.

### 4. Production Checklist (Postgres additions)

- [ ] `DATABASE_URL` set with `?sslmode=require`
- [ ] `PG_POOL_MAX` tuned (`floor(max_connections / instances) - 2`)
- [ ] Migrations verified (exit code 0 from `--verify-only`)
- [ ] Automated backups enabled on Postgres instance
- [ ] Connection string stored in secret manager (not `.env` file)
- [ ] App server can reach Postgres on port 5432 (firewall/VPC rules)

---

## Scaling (Future)

### Phase 1: Single Server (Current)
- Works for <20 concurrent users
- ~10-20 requests/sec

### Phase 2: Load Balanced (Future)
- Multiple servers behind reverse proxy
- Shared database (PostgreSQL)
- Redis cache for theme stats

### Phase 3: Distributed (Future)
- Database sharding by rating range
- Read replicas for queries
- CDN for static assets

## Troubleshooting

### Client won't load

```bash
# Check client build
ls packages/client/dist/

# Check Nginx config
sudo nginx -t

# Check proxy
curl -v http://localhost:3001/
```

### Server won't start

```bash
# Check Node.js
node --version

# Check port available
lsof -i :3001

# Check .env file
cat .env

# Run with debug logging
NODE_DEBUG=* node packages/server/src/index.js
```

### Database errors

```bash
# Check file exists
ls -lah packages/server/data/puzzles.db

# Check permissions
stat packages/server/data/puzzles.db

# Check disk space
df -h

# Rebuild if corrupted
rm packages/server/data/puzzles.db
npm run build:db
```

## Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See other docs in `./docs/`
- **Local Testing**: Reproduce issue in `npm run dev` first
- **Server Logs**: Check systemd/Docker logs for errors
