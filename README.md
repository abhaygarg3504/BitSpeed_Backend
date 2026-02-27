# Bitespeed Identity Reconciliation

A backend service that identifies and links customer contacts across multiple purchases using different emails/phone numbers.

## 🛠 Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Dev Server:** Nodemon

## 📁 Project Structure

```
src/
├── controllers/
│   └── identifyController.ts   # Request/response handling
├── services/
│   └── identityService.ts      # Core business logic (BFS graph traversal)
├── routes/
│   └── identify.ts             # Route definitions
├── middleware/
│   └── errorHandler.ts         # Global error & 404 handlers
├── types.ts                    # TypeScript interfaces
├── prismaClient.ts             # Prisma singleton
└── index.ts                   # App entry point
prisma/
└── schema.prisma               # DB schema
```

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd bitespeed-identity
npm install
```

### 2. Setup Environment

```bash
cp .env
```

Edit `.env` and set your PostgreSQL connection string:

```
# Server Port
PORT=3000

# Connect to Supabase via connection pooling (Transaction mode / port 6543 / pgbouncer=true)
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@[aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true)"

# Direct connection to the database. Used ONLY for migrations (Session mode / port 5432)
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@[aws-1-ap-south-1.pooler.supabase.com:5432/postgres](https://aws-1-ap-south-1.pooler.supabase.com:5432/postgres)"
```

### 3. Run Database Migration

```bash
# Generate Prisma Client
npm run db:generate

# Run Database Migrations (uses DIRECT_URL)
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### `POST /identify`

Identifies and reconciles contact information.

**Request Body:**
```json
{
  "email": "doc@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu", "emmett@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### `GET /health`

Returns server and DB health status.

---

## 🧠 How It Works

1. **Direct Match** — Find all contacts matching the incoming email OR phone
2. **BFS Traversal** — Expand to the full connected component (all linked contacts)
3. **Primary Election** — The oldest contact (`createdAt`) becomes the primary
4. **Merge Primaries** — If two separate primaries get linked, the newer one is demoted to secondary
5. **Create Secondary** — If the request contains new info (new email or phone), a secondary contact is created
6. **Response** — Returns consolidated contact with primary first in arrays

---


## 🔗 Live Endpoint

> https://bitspeed-backend-zzi6.onrender.com/
