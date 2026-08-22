DocuScale

A high-availability, multi-tenant B2B SaaS document engine ("Mini-Notion") engineered to handle high-concurrency workloads. This project shifts focus away from standard CRUD operations toward solving complex infrastructure, caching, and multi-tenant security bottlenecks.

## 🛠️ Tech Stack
* **Frontend:** Next.js (App Router)
* **Backend:** NestJS Cluster (3 Replicas)
* **ORM & DB:** Prisma + PostgreSQL
* **Auth:** Better Auth
* **Caching:** Redis
* **DevOps:** NGINX (Load Balancer / Reverse Proxy) & Docker Compose

---

## 🏗️ Architecture Blueprint

Use code with caution.[Next.js Client] ──► [NGINX Gateway (Rate Limiter / Proxy)]│┌───────────────┼───────────────┐▼               ▼               ▼[NestJS Node 1] [NestJS Node 2] [NestJS Node 3]│               │               │└───────┬───────┴───────┬───────┘▼               ▼[Redis Cache]  [PostgreSQL DB]
### ⚡ Key Features & DevOps Layers
* **Horizontal Scaling:** Scaled the application layer across 3 stateless NestJS container replicas managed by an NGINX round-robin load balancer configuration.
* **IP Rate Limiting:** Throttled requests at the edge gateway layer via NGINX `limit_req_zone` directives to protect services from brute-force scripts.
* **Sub-Millisecond Auth (RBAC):** Integrated Better Auth sessions with a custom NestJS `BetterAuthRolesGuard` that checks a Redis look-aside cache first, removing database database thrashing for workspace permissions.
* **Smart Cache Eviction:** Built automated interceptors to cache document query matrices on reads (`GET`) and dynamically evict relevant caches instantly during tenant mutations (`POST`, `PUT`, `DELETE`).
* **Optimized Queries:** Developed structural pipelines for case-insensitive partial searches and cursor pagination to keep PostgreSQL execution times uniform regardless of dataset size growth.

---

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env` file in your root workspace:
```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/docuscale?schema=public"
REDIS_URL="redis://redis:6379"
BETTER_AUTH_SECRET="your-ultra-secure-better-auth-secret-key"
NEXT_PUBLIC_API_URL="http://localhost/api"
```

### 2. Launch the Infrastructure Cluster
Boot up the integrated system (PostgreSQL, Redis, NGINX, and application instances) in detached mode:
```bash
docker compose up --build -d
```

### 3. Initialize the Database Schema
Push the multi-tenant Prisma models down to your local PostgreSQL container instance:
```bash
npx prisma db push
```

---

## 📡 Core API Endpoints

All tenant operations require target workspace visibility routing context.

| Method | Endpoint | Access Level (RBAC) | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/sign-up` | Public | Registers a new user session via Better Auth |
| `GET` | `/api/w/:workspaceId/docs` | Viewer / Editor / Admin | Fetches paginated documents *(Cached in Redis)* |
| `POST` | `/api/w/:workspaceId/docs` | Editor / Admin / Owner | Creates a document *(Triggers cache eviction)* |
| `DELETE`| `/api/w/:workspaceId/docs/:id`| Admin / Owner | Deletes a document *(Triggers cache eviction)* |
