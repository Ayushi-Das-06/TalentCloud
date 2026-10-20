# Testing and Verification

## Commands

Run from the relevant package directory:

```powershell
# backend
npm ci
npm run prisma:generate
npm run build
npm test
npm run test:e2e

# frontend
npm run build
```

## Verified locally (2026-10-20)

- Backend TypeScript build: passed after clean install and Prisma Client generation.
- Fresh backend `npm ci` passed in a clean copy and in the actual Windows/OneDrive checkout with `backend/.npmrc` setting `foreground-scripts=true`; no `--ignore-scripts` workaround was used. Explicit `npm run prisma:generate` passed (Prisma Client 6.19.3), followed by backend build and all tests.
- Both Prisma schemas validated. PostgreSQL validation used a placeholder URL (schema-only). A local PostgreSQL 18 service is running, but a passwordless `psql` connection was rejected; no real application lifecycle test ran against it.
- Backend test suite: 9 files, 41 tests passed. Coverage includes production/Redis/S3 configuration, project privacy, pagination, Redis counter behavior, auth rate limits, uploads/storage, memory queue, intelligent features, parsing, and API gates.
- A fresh disposable SQLite database initialized with `npm run prisma:push` and seeded successfully with the synthetic demo dataset; the database was removed afterward.
- `npm run test:e2e` passed against a clean temporary SQLite database using the in-memory rate-limit fallback: readiness, registration role escalation denial, suspended-session/login denial, draft privacy/publication/deletion, proposals and pagination, concurrent hiring/withdrawal/cancellation consistency, task access, attachment upload/access/deletion, resume worker/skill confirmation, contract completion, notification privacy, and reciprocal/duplicate review behavior.
- Resume regression check: extracted skills remain suggestions only and do not enter the public freelancer profile until that freelancer explicitly confirms them; full SQLite E2E passed after the fix.
- `docker compose config --quiet` passed; the resolved API and worker S3 credentials match the MinIO environment defaults. `minio-init` retains a single shell script argument that retries `mc alias set`, loops on `mc ready local`, then runs `mc mb --ignore-existing`.
- `docker compose build` passed for API, worker, and frontend. `docker compose --profile tools build toolbox` passed. Dockerfile builds include frontend TypeScript/Vite production compilation, backend PostgreSQL Prisma Client generation and TypeScript compilation, and production backend dependency installation (zero vulnerabilities reported).
- Services were not started in this check. Compose PostgreSQL schema push/seed, service health, real PostgreSQL/Redis/MinIO integration, and browser workflow remain unverified. No Docker volumes or databases were deleted or reset.
- Started the built API and Vite dev server against a separately seeded disposable SQLite database. HTTP smoke verified API liveness (`HEALTHY`), database readiness (`READY`), one public seeded project, frontend app shell (HTTP 200), and CORS preflight (HTTP 204). The test DB was removed and both servers stopped afterward. This did not exercise a full interactive browser workflow.
- Frontend `npm ci` passed (221 packages including lint dependencies; zero advisories). `npm run lint` passed without warnings, and `npm run build` passed TypeScript and Vite production compilation. The initial JavaScript chunk is 231.14 kB minified; Recharts is isolated in a 367.64 kB chunk.
- GitHub access check: authenticated fetch succeeded for the private repository. Before the implementation commit, `codex/talentcloud-audit` matched its upstream; after the commit, the verified commit was pushed as a fast-forward and local/upstream now point to the same revision.

## Not verified

- PostgreSQL service lifecycle, Docker container startup, and Compose integration. The images build, but the tested API lifecycle used disposable SQLite.
- Shared Redis rate-limit behavior against a running Redis instance. The fixed-window store is unit tested with a fake Redis client; local Compose wires the API to Redis.
- Actual PostgreSQL app lifecycle and Docker container startup, browser-driven E2E, and accessibility checks.
- Redis/BullMQ runtime and SQS/S3 live services. The in-memory resume worker was exercised end to end.
- AWS credentials/account are not available; no cloud resources or charges. Docker images were built, but no containers were started.
- PostgreSQL listens on local port 5432, but no credentials were available; no database was modified. Redis and MinIO ports 6379 and 9000 are unavailable.
- S3 deletion uses the AWS SDK `DeleteObject` operation but has not been exercised against a live bucket.

## Dependency audit

- The first audit found critical and moderate advisories in the old Vitest 3 dependency tree. The test runner was upgraded to Vitest 5.0.3 and its current suite passes.
- Mammoth was evaluated for DOCX extraction, then removed because its `argparse`/`sprintf-js` dependency chain added a moderate advisory. DOCX extraction now reads `word/document.xml` from the DOCX ZIP using JSZip and has a fixture test.
- Backend `npm audit`, backend `npm audit --omit=dev`, and frontend `npm audit` all report zero vulnerabilities. Backend uses a scoped npm override for `@prisma/config` to `deepmerge-ts@8.0.2` and Multer 2.4.0 for upstream multipart denial-of-service fixes; Prisma 6.19.3 remains unchanged. Recheck these dependencies as advisories evolve.
- Frontend and backend dependency audits are clean. The backend advisory was resolved with a narrowly scoped dependency override and verified against the app's Prisma validation and local test suite; this does not upgrade Prisma itself.
- Direct Prisma `db push` returns a blank engine error when its SQLite target file does not exist in this Windows workspace. `npm run prisma:push` creates an empty file first and has been verified against a fresh disposable database. It does not overwrite an existing database file.
- The checked-in database contained seeded sample marketplace rows and password hashes, so it has been removed from the current branch snapshot and matching local database files are ignored. The local `backend/prisma/dev.db` remains in place; older Git history is unchanged.
