# Multi-Tenant Backend with Database Routing & Structured Logging

A single Express.js backend service that serves multiple medical practices, each with its own isolated PostgreSQL database, routed dynamically from one set of endpoints.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (separate DB per practice)
- **DB Driver:** node-postgres (`pg`) — raw SQL, no ORM
- **Logging:** Winston + winston-daily-rotate-file
- **Other:** `uuid` for request IDs, `dotenv` for config

---

## Project Structure

```
dental-service/
├── src/
│   ├── config/
│   │   └── db.js                  # Pool initialization + query wrapper
│   ├── middleware/
│   │   ├── requestId.js           # UUID per request
│   │   ├── tenantRouter.js        # X-Practice-Id → dbPool routing
│   │   └── requestLogger.js       # request_started / request_completed logs
│   ├── controllers/
│   │   ├── patients.controller.js        
│   │   ├── appointments.controller.js
│   │   └── health.controller.js
│   ├── routes/
│   │   ├── patients.js            # POST, GET /:id, GET ?search=
│   │   ├── appointments.js        # POST, GET with filters
│   │   └── health.js              # GET /health — both DBs independently
│   ├── logger/
│   │   └── index.js               # Winston structured JSON config
│   └── app.js                     # Express setup + middleware chain
├── logs/                          # Rotating log files (gitignored)
├── setup.sql                      # Schema — run against both DBs
├── seed.js                        # 50 patients + 200 appointments per DB
├── .env.example                   # Environment variable template
└── README.md
```

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & Install

```bash
git clone <repo-url>
cd dental-service
npm install
```

### 2. Create Databases

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE practice_a_db;
CREATE DATABASE practice_b_db;
CREATE USER devuser WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE practice_a_db TO devuser;
GRANT ALL PRIVILEGES ON DATABASE practice_b_db TO devuser;
\q
```

### 3. Run Schema

```bash
psql -U devuser -d practice_a_db -f setup.sql
psql -U devuser -d practice_b_db -f setup.sql
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Seed Data

```bash
node seed.js
```

### 6. Start Server

```bash
node src/app.js
# or
npm start
```

Server runs on `http://localhost:3000`

---

## Environment Variables

```env
PORT=3xxx

PRACTICE_A_ID=<uuid>
PRACTICE_A_DB=postgresql://<username>:<password>@localhost:5432/<database_name>

PRACTICE_B_ID=u<uuid>
PRACTICE_B_DB=postgresql://<username>:<password>@localhost:5432/<database_name>

LOG_LEVEL=debug
```

---

## API Endpoints

All endpoints except `/health` require the `X-Practice-Id` header.

### Health Check
```
GET /health
```
Returns connectivity status for both databases independently.

### Patients

```
POST   /patients                     Create patient in routed DB
GET    /patients/:patient_id         Fetch by ID (404 if not in this practice)
GET    /patients?search=<name|phone> Search with pagination
```

### Appointments

```
POST   /appointments                                    Create appointment
GET    /appointments?from=<date>&to=<date>&status=<>    List with filters + pagination
```

---

## Cross-Practice Isolation Demo

```bash
# Create patient in Practice A
curl -X POST http://localhost:3000/api/v1/patients \
  -H "X-Practice-Id: <uuid>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul Sharma", "phone": "9876543210", "email": "rahul@gmail.com"}'
# Returns: { "patient_id": 51, ... }

# Try to fetch Practice A patient using Practice B header → 404
curl http://localhost:3000/api/v1/patients/51 \
  -H "X-Practice-Id: uuid-bbb"
# Returns: { "error": "Patient not found in this practice" }
```

---

## Log Format

Every log line is a flat JSON object:

```json
{
  "timestamp": "2026-05-28T14:17:22.893Z",
  "level": "info",
  "event": "request_completed",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "practice_id": <uuid>,
  "route": "/papi/v1/atients",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 45
}
```

Logs are written to:
- **stdout** — for container/cloud environments
- **logs/app-YYYY-MM-DD.log** — rotating by day, max 20MB per file, 14 days retained

### Log Events

| Event | Level | When |
|---|---|---|
| `request_started` | info | Every incoming request |
| `routing_resolved` | debug | Practice ID validated, pool attached |
| `db_query` | debug | Every DB query with SQL + params |
| `slow_query` | warn | Any query over 200ms |
| `request_completed` | info | Request finished successfully |
| `request_failed` | error | Request finished with error |
| `validation_failed` | warn | Missing/invalid headers or fields |
| `health_check_failed` | error | DB unreachable during health check |

---

## Sample jq Queries

### All slow queries for Practice A in the last hour
```bash
cat logs/app-$(date +%Y-%m-%d).log | \
  jq -c 'select(.event == "slow_query" and .practice_id == "uuid-aaa")'
```

### All failed requests grouped by route
```bash
cat logs/app-$(date +%Y-%m-%d).log | \
  jq -c 'select(.event == "request_failed") | {route, method, status_code, request_id}' | \
  jq -s 'group_by(.route) | map({route: .[0].route, count: length, requests: .})'
```

### Average request duration per practice
```bash
cat logs/app-$(date +%Y-%m-%d).log | \
  jq -c 'select(.event == "request_completed") | {practice_id, duration_ms}' | \
  jq -s 'group_by(.practice_id) | map({practice: .[0].practice_id, avg_duration_ms: (map(.duration_ms) | add / length)})'
```

---

## Decision Log

### 1. Where does routing logic live and why?

Routing lives in a single `tenantRouter` middleware (`src/middleware/tenantRouter.js`). It reads `X-Practice-Id`, looks up the correct pool, and attaches `req.dbPool` to the request.

Route handlers never decide which DB to use — they just call `req.dbPool.query()`. This makes cross-practice leakage architecturally impossible, not just carefully avoided.

### 2. How is cross-practice leakage prevented?

Each practice has a physically separate PostgreSQL database with its own connection pool. The middleware injects the correct pool object into `req` — route handlers have no access to the pool map and cannot request a different practice's pool. There is no shared connection, no shared pool, no shared schema.

### 3. Pool sizing reasoning

Each pool is set to `max: 10` connections. With 2 practices, that is 20 total connections against PostgreSQL's default `max_connections` of 100 — well within safe limits. `idleTimeoutMillis: 30000` releases unused connections after 30 seconds. In production, the pool size would be tuned based on actual concurrent load per practice.

### 4. Logging schema reasoning

Flat JSON was chosen over nested objects so every field is directly accessible via `jq` without path traversal. `request_id` as a correlation ID enables tracing the full lifecycle of any request across all log lines. SQL parameters are logged separately from the query string to avoid sensitive data appearing inline and to keep logs safe from SQL injection patterns. Stack traces are in a dedicated `stack` field, so `grep` and `jq` filters on `event` or `message` remain clean.

### 5. What would change to support 100 practices?

- Move practice config from `.env` to a `practices` table in a separate admin database
- Load pools dynamically on first request per practice (lazy initialisation) and cache in memory
- Add a pool eviction strategy for idle practices to avoid holding 100 open pool objects
- Add a circuit breaker per pool so one unhealthy DB does not cascade
- Move `X-Practice-Id` validation to a JWT claim so practices cannot spoof each other's IDs

---

## Curl Examples

```bash
# Health check
curl http://localhost:3000/health

# Create patient
curl -X POST http://localhost:3000/api/v1/patients \
  -H "X-Practice-Id: uuid-aaa" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","phone":"9876543210","email":"rahul@gmail.com"}'

# Fetch patient
curl http://localhost:3000/api/v1/patients/1 \
  -H "X-Practice-Id: uuid-aaa"

# Search patients
curl "http://localhost:3000/api/v1/patients?search=Rahul&page=1&limit=5" \
  -H "X-Practice-Id: uuid-aaa"

# Create appointment
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "X-Practice-Id: uuid-aaa" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"scheduled_at":"2026-06-15T10:00:00Z","status":"scheduled","notes":"Regular checkup"}'

# List appointments with filters
curl "http://localhost:3000/api/v1/appointments?from=2026-01-01&to=2026-12-31&status=scheduled" \
  -H "X-Practice-Id: uuid-aaa"

# Cross-practice leakage test — returns 404
curl http://localhost:3000/patients/1 \
  -H "X-Practice-Id: uuid-bbb"

# Missing header test — returns 400
curl http://localhost:3000/api/v1/patients/1
```
