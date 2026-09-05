# 🇮🇳 India Pincode API

A high-performance, production-ready backend API for Indian Postal PIN codes with **up-to-date state and district data** (reflecting all recent district reorganizations and bifurcations).

Built strictly with:
- **Runtime & Language**: Node.js & TypeScript
- **Framework**: Express.js
- **Validation**: Zod
- **Database**: PostgreSQL with connection pooling & B-Tree indexes
- **Caching**: Tiered architecture with L1 In-Memory LRU Cache (`lru-cache`) and L2 Redis (`ioredis`)
- **Authentication**: API Key verification (`x-api-key` header or `Authorization: Bearer <key>`) with timing-safe comparison

---

## ⚡ Key Highlights

1. **Drop-in Compatible with `api.postalpincode.in`**:
   The `GET /pincode/:pincode` endpoint returns the exact schema expected by existing integrations, but with updated, accurate district and state details.
2. **Sub-Millisecond Response Times**:
   L1 LRU in-memory cache delivers responses in <1ms. Responses include `X-Cache: HIT` or `X-Cache: MISS` headers.
3. **Graceful Fallback**:
   If Redis is not configured or goes down, the API automatically falls back to in-memory caching with zero downtime or disruption.
4. **Streaming Big-Data Seeder**:
   Includes a streaming CSV parser capable of importing 150,000+ records from the official India Post directory without high memory usage.

---

## 🚀 Quick Start

### 1. Start Database & Cache Containers
Run the dedicated PostgreSQL 16 (on port 5433) and Redis 7 containers:

```bash
docker compose up -d
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://pincode_user:pincode_password@localhost:5433/pincode_db
REDIS_URL=redis://localhost:6379
API_KEYS=pincode_dev_secret_key_12345,partner_prod_api_key_88321
CACHE_TTL_SECONDS=86400
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

### 3. Run Migrations & Seed Data
```bash
npm run db:seed
```

To ingest an official CSV dataset downloaded from [data.gov.in](https://data.gov.in/resource/all-india-pincode-directory):
```bash
npm run db:seed -- --file /path/to/all_india_pincode_directory.csv
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`.

---

## 🔑 Authentication

All postal lookup endpoints require an API key passed via either:
- Header: `x-api-key: pincode_dev_secret_key_12345`
- Header: `Authorization: Bearer pincode_dev_secret_key_12345`

---

## 📡 API Endpoints

### 1. Pincode Lookup (`api.postalpincode.in` Compatibility)
**`GET /pincode/:pincode`**

**Request:**
```bash
curl -s -H "x-api-key: pincode_dev_secret_key_12345" \
  http://localhost:3000/pincode/632006
```

**Response (`200 OK`):**
```json
[
  {
    "Message": "Number of pincode(s) found:8",
    "Status": "Success",
    "PostOffice": [
      {
        "Name": "Gandhinagar (Vellore)",
        "Description": null,
        "BranchType": "Sub Post Office",
        "DeliveryStatus": "Delivery",
        "Circle": "Tamilnadu",
        "District": "Vellore",
        "Division": "Vellore",
        "Region": "Chennai Region",
        "Block": "Katpadi",
        "State": "Tamil Nadu",
        "Country": "India",
        "Pincode": "632006",
        "Latitude": 12.9698,
        "Longitude": 79.1384
      }
    ]
  }
]
```

### 2. RESTful Pincode Lookup with Query Filters
**`GET /api/v1/pincode/:pincode`**

Query parameters:
- `district` (string, optional)
- `state` (string, optional)
- `delivery_status` ("Delivery" | "Non-Delivery", optional)

**Request:**
```bash
curl -s -H "x-api-key: pincode_dev_secret_key_12345" \
  "http://localhost:3000/api/v1/pincode/632006?delivery_status=Delivery"
```

### 3. Post Office Name Search
**`GET /api/v1/postoffice/:name`**

**Request:**
```bash
curl -s -H "x-api-key: pincode_dev_secret_key_12345" \
  http://localhost:3000/api/v1/postoffice/Gandhinagar
```

### 4. Cache Statistics
**`GET /api/v1/cache/stats`**

**Request:**
```bash
curl -s -H "x-api-key: pincode_dev_secret_key_12345" \
  http://localhost:3000/api/v1/cache/stats
```

### 5. Health Check
**`GET /health`** (Public probe for monitoring / Kubernetes)

**Request:**
```bash
curl -s http://localhost:3000/health
```

---

## 🧪 Testing

Run test suite with Vitest:
```bash
npm test
```

Build production bundle:
```bash
npm run build
npm start
```
