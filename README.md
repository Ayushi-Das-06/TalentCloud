# TalentCloud

TalentCloud is a cloud-based freelancing and project marketplace with client and freelancer workflows, explainable project matching, resume skill extraction, skill-gap analysis, budget and timeline estimates, and asynchronous job processing.

## Current implementation

- React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, and Recharts frontend.
- Express 4, TypeScript, Prisma, and SQLite for local development. A PostgreSQL Prisma schema is provided for containers and hosted deployments.
- JWT authentication, role checks, project/application/hiring/task/review/notification APIs, local file storage, and a resume analysis worker.
- In-memory jobs for local runs; BullMQ/Redis and AWS SQS have queue adapters and a separate worker process.
- Local files and AWS S3 are supported through storage adapters. AWS integrations require configured resources and credentials or IAM roles; they were not exercised in this environment.
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

The backend uses the local SQLite schema by default. `npm run seed` clears and recreates the configured database with demo data, so run it only against a disposable development database. The seeded demo account passwords are listed in [DEMO_GUIDE.md](./DEMO_GUIDE.md).

The in-memory queue processes jobs in the API process. For BullMQ or SQS, run `npm run worker` in a separate backend terminal. BullMQ requires Redis and `QUEUE_DRIVER=bullmq`. SQS requires a standard queue URL, AWS region, and credentials or an IAM role, with `QUEUE_DRIVER=sqs`. For S3, set `STORAGE_DRIVER=s3`, bucket, and region; use an IAM role in AWS instead of static keys.

## Docker development

Docker Compose builds the frontend, API, and worker and starts PostgreSQL and Redis. It uses the PostgreSQL schema and local-only development settings. Before using the app for the first time, initialize and seed its database:

```powershell
docker compose up -d postgres redis
docker compose --profile tools run --rm toolbox npm exec prisma -- db push --schema prisma/schema.postgres.prisma
docker compose --profile tools run --rm toolbox npm run seed
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). Docker is not installed in the currently audited local environment, so these container instructions have not been executed here.

## Documentation

- [Project plan and verified status](./PROJECT_PLAN.md)
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
