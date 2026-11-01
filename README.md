# USAI: Unified AI-Powered Event Discovery, Research & Action Platform

A production-oriented event intelligence platform powered by **TinyFish** and modular **Agentic Orchestration** that discovers hackathons, competitions, conferences, workshops, and meetups across the web, normalizes them into a centralized canonical dataset, and provides grounded AI research, personalized natural-language filtering, automated registration assistance, and an end-to-end hackathon idea development workspace with presentation generation.

---

## 🌟 Core Product Principle: Discover Once, Personalize Independently, Act Intelligently

### 1. Shared Event Intelligence Layer
- **Centralized Canonical Records**: Public event data collected from source platforms (Luma, Unstop, Devfolio, Devpost, MLH, Qualcomm, Eventbrite, etc.) is normalized, deduplicated, and stored in a shared database.
- **Request Coalescing & Multi-Level Cache**: When 100 users search for events in Bengaluru or Karnataka, the platform **does not** trigger 100 scraping requests. It executes a single coalesced ingestion job, caches results with a configurable TTL, and serves subsequent searches in milliseconds directly from the shared intelligence layer.

### 2. Personalization Layer
- Each user maintains isolated:
  - Custom natural-language filters (e.g. *"I want free AI hackathons in Bengaluru with team size of at least 2 and prize money"*)
  - Saved events and tracking lists
  - Applicant Profile Vault (reusable credentials and resume details)
  - Assisted registration audits and confirmed submissions
  - Personalized event monitoring alerts and reminders

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |            Next.js Frontend           |
                                  | (Discovery UI, Smart Filter, Modals)  |
                                  +-------------------+-------------------+
                                                      | HTTP / JSON
                                                      v
                                  +---------------------------------------+
                                  |         Express API Gateway           |
                                  |             (/api/v1/...)             |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
         +-------------------------------+                         +-------------------------------+
         |    Specialized Agent Layer    |                         |    Data Ingestion & Storage   |
         |                               |                         |                               |
         | • Discovery Agent             |                         | • Request Coalescing Mutex    |
         | • Natural-Language Filter     |                         | • Canonical Normalizer        |
         | • Event Research Agent (RAG)  |                         | • Entity Deduplication Engine |
         | • Registration Assistant      |                         | • Relational Database (WAL)   |
         | • Idea Validation (14-Point)  |                         | • Vector Embeddings Store     |
         | • Monitoring & Change Alerts  |                         | • Event Knowledge Base Chunks |
         +---------------+---------------+                         +---------------+---------------+
                         |                                                         |
                         +----------------------------+----------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          TinyFish MCP Adapter         |
                                  | (Search, Fetch, Web Automation, Runs) |
                                  +---------------------------------------+
```

---

## 🧩 Specialized Agents & Responsibilities

1. **Discovery & Ingestion Agent**:
   - Queries enabled source adapters (Luma, Unstop, Devfolio, Devpost, MLH, Qualcomm).
   - Uses TinyFish `search` and `fetch_content` for fast, token-efficient extraction.
   - Computes deterministic SHA-256 hashes and verifies field confidence.
2. **Filter Agent**:
   - Interprets conversational user instructions into a validated `StructuredFilterCriteria` object without arbitrary SQL generation.
   - Executes deterministic SQL filters against the canonical dataset.
3. **Event Research Agent**:
   - Performs grounded Q&A on event rules, submission guidelines, team sizes, and eligibility.
   - Cites verified sources and distinguishes between verified facts and unverified data.
4. **Registration Assistant Agent**:
   - Maps the user's stored applicant profile to target event fields.
   - Enforces a mandatory **Human-in-the-Loop review screen** before explicit submission consent.
   - Records an immutable audit log in `registration_audits`.
5. **Hackathon Idea Development Agent**:
   - Scores project concepts against a **14-point validation framework** (feasibility, theme alignment, MVP scope, originality, technical architecture, etc.).
   - Generates a complete project brief and exports an editable **PPTX presentation** file (`pptxgenjs`).
6. **Monitoring & Notification Agent**:
   - Periodically checks monitored event URLs.
   - Performs field-level diff detection (deadline extensions, prize pool modifications, status shifts).
   - Emits alerts while suppressing duplicate notifications.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React icons.
- **Backend**: Node.js, Express, TypeScript (`tsx` runner), Zod validation, `pptxgenjs`, `better-sqlite3`.
- **Database**: SQLite (WAL mode, foreign keys enabled), fully convertible to PostgreSQL / pgvector.
- **Web Toolkit**: TinyFish MCP & REST APIs (`api.search.tinyfish.ai`, `api.fetch.tinyfish.ai`, `agent.tinyfish.ai`).

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+
- A valid `TINYFISH_API_KEY` (already configured in environment or `.env`)

### 1. Backend Setup
```bash
cd backend
npm install
# Seed initial canonical events (optional, runs automatically if DB is empty)
npx tsx src/db/seed.ts
# Run development server
npm run dev
```
Backend runs at `http://localhost:3001` (API endpoints under `http://localhost:3001/api/v1`).

### 2. Run Backend Tests
```bash
cd backend
npm test
```
Runs 7 architectural acceptance tests verifying:
- Centralized canonical data reuse & request coalescing
- Natural language filter interpretation without global data mutation
- Grounded RAG research answers with citations
- Human-in-the-loop registration review checkpoint
- 14-point hackathon idea evaluation & PPTX generation
- Event monitoring & change detection

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 📋 Configurable Items & Next Steps for the User

As requested, here are the modular components that can be customized or added later:

1. **Custom Source Adapters**:
   - Add custom college/company event scrapers in `backend/src/config/sources.ts`.
2. **Email Provider Integration**:
   - To send actual outgoing emails for notifications, configure an SMTP / Resend / SendGrid API key in `backend/src/services/notification.service.ts`.
3. **Database Migration to Remote Postgres**:
   - The canonical models in `backend/src/models/types.ts` and `src/db/database.ts` are 100% ANSI-SQL compatible and can be pointed to Supabase or Neon PostgreSQL with `pgvector` by replacing the DB adapter.

