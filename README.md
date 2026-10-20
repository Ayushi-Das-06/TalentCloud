# TalentCloud

TalentCloud is a cloud-based freelancing and project marketplace with client and freelancer workflows, explainable project matching, resume skill extraction, skill-gap analysis, budget and timeline estimates, and asynchronous job processing.

## Current implementation

- React 18, TypeScript, Vite 8, React Router 7, TanStack Query, Tailwind CSS 4, and Recharts frontend.
- Express 4, TypeScript, Prisma, and SQLite for local development. A PostgreSQL Prisma schema is provided for containers and hosted deployments.
- JWT authentication, role checks, project/application/hiring/task/review/notification APIs, local file storage, and a resume analysis worker.
- In-memory jobs for local runs; BullMQ/Redis and AWS SQS have queue adapters and a separate worker process.
- Local files, RustFS, and AWS S3 use the same private storage adapter. Docker Compose configures RustFS; AWS integrations require configured resources and IAM roles or credentials and were not exercised in this environment.
- Clients and hired freelancers can upload project/task files from the delivery workspace; private downloads check project membership.

## Local setup

Requirements: Node.js 24 (or another Node version supported by the locked dependencies) and npm 11. Docker is optional for local development.

```powershell
cd backend
npm ci
Copy-Item ..\.env.example .env
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The backend uses the local SQLite schema by default. `npm run prisma:push` creates an empty SQLite file only when the configured file is absent, then applies the schema; it does not overwrite an existing database. `npm run seed` clears and recreates records in its configured database with demo data, so run it only against a disposable development database. The seeded demo account passwords are listed in [DEMO_GUIDE.md](./DEMO_GUIDE.md).

On Windows, stop any running backend/worker process before `npm run prisma:generate`; the query-engine DLL cannot be replaced while another Node process has it loaded.

`backend/.npmrc` runs dependency lifecycle scripts in the foreground. This avoids a Prisma Client postinstall race observed with npm 11 on Windows. A fresh backend install (`npm ci`), explicit client generation, build, 41-test suite, and SQLite E2E were verified on this branch. If OneDrive reports `EBUSY` while replacing files, close project processes and work from a local checkout outside OneDrive; do not delete the original project or its data.

The in-memory queue processes jobs in the API process. For BullMQ or SQS, run `npm run worker` in a separate backend terminal. BullMQ requires Redis and `QUEUE_DRIVER=bullmq`. SQS requires a standard queue URL, AWS region, and credentials or an IAM role, with `QUEUE_DRIVER=sqs`. For S3, set `STORAGE_DRIVER=s3`, bucket, and region; use an IAM role in AWS instead of static keys.

## Verify locally

From `backend/`, run `npm ci`, `npm run prisma:generate`, `npm run build`, `npm test`, and `npm run test:e2e`. The E2E uses a temporary SQLite database. From `frontend/`, run `npm ci`, `npm run lint`, and `npm run build`. `npm run seed` clears its target database, so use only the disposable development database described in [DEMO_GUIDE.md](./DEMO_GUIDE.md).

## Docker development

Docker Compose builds the frontend, API, and worker and starts PostgreSQL, Redis, and the pinned official `rustfs/rustfs:1.0.3` S3-compatible object store. Its readiness endpoint and a backend AWS SDK initializer ensure the private `talentcloud-files` bucket exists before the API or worker starts. The RustFS access/secret keys and API/worker S3 credentials resolve from the same `OBJECT_STORAGE_ACCESS_KEY` and `OBJECT_STORAGE_SECRET_KEY` variables (or the legacy `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` fallback). RustFS uses a new `rustfs_data` volume; the old `minio_data` volume remains declared and untouched because MinIO data is not automatically migrated. The browser serves the frontend on port 8080; Nginx proxies `/api/` to the internal API, and the API CORS origin is `http://localhost:8080`. It uses the PostgreSQL schema and local-only development settings. Build first, then initialize a new/empty development database and seed it only if replacing its contents is acceptable:

```powershell
docker compose config
docker compose build
docker compose up -d postgres redis
docker compose --profile tools run --rm toolbox npm run prisma:push:postgres
docker compose up -d
```

Open [http://localhost:8080](http://localhost:8080). The API and worker wait for PostgreSQL/Redis health and successful RustFS readiness plus bucket initialization. The toolbox profile provides the explicit PostgreSQL schema push; it is deliberately not run automatically at API startup. Skip the seed step if the database volume contains data you want to preserve: the seed script deletes and recreates marketplace rows. `docker compose down` keeps database, Redis, RustFS, and upload volumes; do not add `-v` when preserving them. The Compose defaults are disposable local development credentials; set `POSTGRES_PASSWORD`, `OBJECT_STORAGE_ACCESS_KEY`, and `OBJECT_STORAGE_SECRET_KEY` in the root `.env` before sharing the network or using the stack beyond local development.

To load demo accounts and sample rows, seed only a new disposable database whose contents can be replaced. The seed script deletes and recreates marketplace rows; do not run it against an existing database with data to preserve:

```powershell
docker compose --profile tools run --rm toolbox npm run seed
```

`docker compose down` keeps database, Redis, RustFS, and upload volumes; do not add `-v` when preserving them. The Compose defaults are disposable local development credentials; set `POSTGRES_PASSWORD`, `OBJECT_STORAGE_ACCESS_KEY`, and `OBJECT_STORAGE_SECRET_KEY` in the root `.env` before sharing the network or using the stack beyond local development.

## Documentation

- [Project plan and verified status](./PROJECT_PLAN.md)
- [Current audit checklist](./PROJECT_AUDIT.md)
- [Development log](./DEVELOPMENT_LOG.md)
- [Architecture](./ARCHITECTURE.md)
- [API reference](./API.md)
- [Testing](./TESTING.md)
- [AWS deployment preparation and gaps](./AWS_DEPLOYMENT.md)
- [Demo walkthrough](./DEMO_GUIDE.md)
- [Architecture decisions](./DECISIONS.md)

## Security notes

- Never commit `.env` files or real credentials. Production startup requires explicitly configured JWT and cookie secrets of at least 32 characters.
- Local demo credentials and compose passwords are for disposable development use only.
- Uploaded files are private to their owner or project participants. Supported resume types are PDF, DOCX, TXT, and Markdown, with a 10 MB limit.
- Authentication, upload, and expensive matching endpoints have rate limits. Local development defaults to an in-memory counter; set `RATE_LIMIT_REDIS_URL` to a shared `redis://` or `rediss://` endpoint to share fixed-window counters across API replicas. Set `TRUST_PROXY_HOPS` only to the number of trusted reverse proxies in front of the API.
