# Database Driver Reference

Chess Composer ships a pluggable async `DatabaseDriver` interface. SQLite is the
default and requires no external service. Postgres is opt-in for production.

## Switching Drivers

Set `DATABASE_DRIVER` in your environment (or `.env` file):

| Value | Requirement |
|-------|-------------|
| `sqlite` (default) | None — uses `better-sqlite3` |
| `postgres` | Running Postgres + `DATABASE_URL` set |

### SQLite (default)

```bash
DATABASE_DRIVER=sqlite
# Optional: override the default path
SQLITE_PATH=./packages/server/data/puzzles.db
```

### Postgres

```bash
DATABASE_DRIVER=postgres
DATABASE_URL=postgres://chess_user:password@localhost:5432/chess_composer
# Optional pool cap (default 10)
PG_POOL_MAX=10
```

See `.env.example` for the full list of supported variables.

---

## Local Postgres via Docker

A ready-made compose file is provided for local development:

```bash
# Start Postgres (port 5432, persisted volume pg_data)
docker compose -f docker-compose.dev.yml up -d

# Verify it is healthy
docker compose -f docker-compose.dev.yml ps
# Expected: postgres   running (healthy)

# Stop and retain data
docker compose -f docker-compose.dev.yml stop

# Stop and wipe data volume
docker compose -f docker-compose.dev.yml down -v
```

Default local connection string:

```
postgres://postgres:postgres@localhost:5432/postgres
```

> Credentials are intentionally weak and loopback-only. Never use them outside dev.

---

## Data Migration CLI (SQLite → Postgres)

One-way copy of all data from an existing SQLite file into a Postgres database.
Schema migrations are run automatically on the Postgres target before data is copied.

### Full command reference

```bash
node packages/server/src/cli/migrate-to-postgres.js [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--source-sqlite=<path>` | `SQLITE_PATH` env or `data/puzzles.db` | SQLite source |
| `--target-url=<url>` | `DATABASE_URL` env | Postgres connection URL |
| `--batch-size=<n>` | `1000` | Rows per INSERT batch |
| `--table=<name>` | all tables | Single-table mode |
| `--verify-only` | — | Count check only, no writes |
| `--dry-run` | — | Connect + plan, no inserts |
| `--allow-non-empty` | — | Skip safety guard for non-empty target |
| `--help` | — | Print help |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — all counts match |
| `1` | Count mismatch (partial copy) |
| `2` | Connection failure or fatal error |

### Typical usage

```bash
# 1. Start local Postgres
docker compose -f docker-compose.dev.yml up -d

# 2. Export env vars
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
export SQLITE_PATH=packages/server/data/puzzles.db

# 3. Dry-run first (no writes)
npm -w packages/server run db:migrate-to-postgres -- --dry-run

# 4. Full migration
npm -w packages/server run db:migrate-to-postgres

# 5. Verify-only pass (spot-check after migration)
npm -w packages/server run db:migrate-to-postgres -- --verify-only
```

### Sample output

```
Running schema migrations on Postgres...
  ✓ 001_add_source_field.js
  ...
  ✓ 011_add_content_description.js

Copying 11 table(s) | batch-size=1000...

  puzzles             3500000 rows ... done (3.5 s)
  students              1200 rows ... done
  ...

Resetting sequences...
  Sequence reset: students.id
  Sequence reset: users.id
  ...

Verifying row counts...

Migration summary:
--------------------+----------+----------+-------+--------------
table               |sqlite    |pg        |match  |inserted-run
--------------------+----------+----------+-------+--------------
puzzles             |3500000   |3500000   |YES    |3500000
students            |1200      |1200      |YES    |1200
...
--------------------+----------+----------+-------+--------------

All counts match.
```

---

## Troubleshooting

### FK constraint errors during copy

The CLI copies tables in dependency order (parents before children). If you see FK
errors, your SQLite data may have orphaned rows. Use single-table mode to isolate:

```bash
node packages/server/src/cli/migrate-to-postgres.js --table=students
```

### Postgres target not empty

By default the CLI refuses to overwrite existing data. Options:

```bash
# Option A: wipe and restart
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d

# Option B: proceed anyway (ON CONFLICT DO NOTHING keeps existing rows)
node packages/server/src/cli/migrate-to-postgres.js --allow-non-empty
```

### Sequence out of sync after migration

Run `--verify-only` first, then re-run the full CLI — it always resets sequences
via `setval(pg_get_serial_sequence(...))` after copying.

### Idempotent re-run

Re-running with `--allow-non-empty` is safe. Existing rows are preserved via
`ON CONFLICT DO NOTHING`; only missing rows are inserted.

---

## Production Deployment

### Connection string with TLS

Always append `?sslmode=require` for cloud-managed Postgres:

```
DATABASE_URL=postgres://chess_user:pass@db.example.com:5432/chess_composer?sslmode=require
```

### Secret management

Never commit `DATABASE_URL` to git. Use:

- **Linux systemd**: `EnvironmentFile=/etc/chess-composer/secrets.env` (mode 600)
- **Docker**: `--env-file .env` or Docker secrets
- **Kubernetes**: `secretKeyRef` in pod spec
- **Cloud (AWS/GCP)**: Secrets Manager / Secret Manager — inject at runtime

### Pool tuning

`PG_POOL_MAX` defaults to 10. A safe formula for most deployments:

```
PG_POOL_MAX = floor(pg_max_connections / num_app_instances) - 2
```

Typical Postgres default `max_connections = 100`, single app instance → `PG_POOL_MAX=8`.

### Run migrations on first deploy

```bash
# Migrations run automatically when the server starts.
# For zero-downtime deploys, run the CLI before switching traffic:
DATABASE_DRIVER=postgres DATABASE_URL=<prod_url> \
  node packages/server/src/cli/migrate-to-postgres.js --verify-only
```

If counts match, traffic switch is safe.

### CI pattern (no .github/workflows in repo)

If you add CI later, use a service container pattern:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_PASSWORD: ci
      POSTGRES_DB: chess_test
    options: >-
      --health-cmd "pg_isready -U postgres"
      --health-interval 5s
      --health-retries 10

steps:
  - run: |
      DATABASE_DRIVER=postgres \
      DATABASE_URL=postgres://postgres:ci@localhost:5432/chess_test \
        npm test
```
