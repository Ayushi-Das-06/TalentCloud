# Development Log

## 2026-10-09 — Initial project scaffold

- Added the React frontend, Express/Prisma backend, SQLite and PostgreSQL schemas, seed data, and initial marketplace modules.
- Added architecture notes and a local infrastructure Compose file.

## 2026-10-10 — Repository access and implementation audit

- Confirmed local Codex mode and inspected the existing project checkout. Fetched the private `codex/talentcloud-audit` branch from GitHub; changes were committed and pushed as fast-forwards without touching `main`.
- Read the existing README, plan, development log, decisions, manifests, schemas, route modules, and implementation files.
- Corrected backend type definitions to match Express 4; generated the Prisma client from the checked-in local schema.
- Added ownership checks for candidate matching, file downloads, task access, and reviews. Locked admin routes behind the ADMIN role and removed private emails, attachments, and unrelated contracts from public project responses.
- Hardened local file path containment and made production startup require explicit strong JWT and cookie secrets.
- Implemented the BullMQ consumer lifecycle in the standalone worker and retry handling. Added AWS SDK S3 and SQS adapters; live cloud calls remain unverified without AWS access.
- Added DOCX resume text extraction using JSZip/XML handling and limited upload types to formats the parser supports. Removed Mammoth after its dependency audit identified a moderate advisory.
- Added project/task file upload and workspace links, plus API access-control, local path traversal, and DOCX extraction regression tests; updated Docker build files and project documentation.
- Added project file deletion for the uploader, project owner, or administrator, with local/S3 object cleanup and a workspace delete control.
- Rechecked public project visibility and private profiles; added auth/upload/matching rate limits, route/query/body validation, upload signature checks, profile editing, notification controls, and role-aware login redirects.
- Made PostgreSQL resume/profile JSON-text fields match SQLite, added explicit resume skill confirmation, and made resume retries idempotent with terminal failure status updates.
- Wired the Compose API/worker to MinIO, added bucket initialization and trusted-proxy configuration, and added graceful queue/worker shutdown.
- Added the missing `PROJECT_AUDIT.md` checklist and updated API, setup, and limitation documentation.
- Added a repeatable `npm run test:e2e` smoke that builds a disposable SQLite database and exercises registration through review, including concurrent hiring and in-process resume-worker processing.
- Added a local SQLite initialization helper. `npm run prisma:push` creates an empty file when needed before running Prisma; verified it on a clean ignored database. The existing seed script also passed on a separate disposable database.
- Verified both Prisma schema validations and client generations, backend build and 30 regression tests, SQLite E2E, and frontend production build. Docker/Compose and live AWS remain unverified.
- Added lazy-loaded route modules for every page. The frontend production build now emits a 232.52 kB initial JavaScript bundle and a separate 372.43 kB charting bundle.

## 2026-10-11 — Continued completion work

- Added validated, capped pagination to client proposal listings and page controls to the client proposal review screen.
- Added a database readiness endpoint and configured the Compose API health check to wait for PostgreSQL readiness.
- Added unit coverage for page and limit bounds and extended the clean SQLite E2E smoke to verify page results and total count.
- Added an optional shared Redis rate-limit store with bounded fixed-window counters, TLS URL validation, Compose wiring, and clean shutdown.
- Verified backend build, 37 backend tests, full SQLite E2E smoke, and frontend production build.
- Rechecked local tooling and dependency advisories. Docker, Terraform, and AWS CLI are unavailable; three high-severity advisories remain in Prisma's config dependency chain and need a compatible Prisma upgrade.
- Fixed a cancellation-versus-hiring race by making client cancellation an atomic update conditioned on project ownership and `OPEN` status. Added an E2E race assertion confirming cancellation and hiring leave consistent project/contract states. Backend build, 37 unit tests, the clean SQLite E2E smoke, frontend production build, and SQLite/PostgreSQL Prisma schema validation passed after the fix. The PostgreSQL schema check used a placeholder URL and did not connect to a server.

## Open work

- Complete integration/E2E coverage, actual Docker/AWS deployment validation, and resolve the Prisma config dependency advisories.
- Resolve remaining Prisma config dependency advisories through a compatible, verified Prisma upgrade.
- Checkpoint: `83b4b5d` (`fix(hiring): prevent cancellation and hire race`). The verified fix and its E2E regression were committed on `codex/talentcloud-audit`.
- Redis rate-limit checkpoint review: the Redis store/config tests passed (7 tests) and API security tests passed (7 tests). A live shared-Redis request test remains blocked because Redis, Docker, and a reachable local Redis endpoint are unavailable; rate-limit storage errors are intentionally not logged with connection details.
- Security artifact review: no tracked credential-pattern matches, private key files, or local SQLite database artifacts were found. `.env.example` is the only tracked env file; local `.env` and database files are ignored. Scope is the current checkout; full Git-history scanning was not performed.
- Production auth configuration review: config tests passed (5 tests), including rejection of missing and development-default secrets. Auth cookies are configured HttpOnly, Secure in production, and SameSite=Lax. HTTPS proxy deployment behavior remains unverified.
- Project privacy regression: public discovery and detail query projections are tested to omit client email; existing tests continue to verify unauthenticated draft/non-open visibility. Focused project visibility suite passed (6 tests).
- Checkpoint: `57ed2ca` (`test(security): protect public project privacy`).
- Project lifecycle completion: added private draft creation, owner-only publish, and safe deletion of empty drafts. Project updates now atomically claim the observed status to avoid stale lifecycle races; uploads are blocked for drafts to prevent orphaning files. Backend build passed, all 39 backend unit/integration tests passed, full SQLite marketplace E2E passed (including draft visibility, publish role, owner-only delete, and refusal to delete published projects), and frontend production build passed. Deletion intentionally refuses drafts with related applications, contracts, tasks, or files.
- Checkpoint: `6551fc5` (`feat(projects): add safe draft lifecycle`).
- Application transition security: submission serializes against project state changes, hiring conditionally claims the pending application inside its contract transaction, and withdrawal uses an owner-and-status conditional update. SQLite E2E raced withdrawal with hiring and confirmed consistent terminal state; it also verified cross-user withdrawal denial. Backend build and all 39 backend tests passed.
- Checkpoint: `49c57b4` (`fix(applications): make hiring and withdrawal atomic`).
- Notification privacy regression: list and mark-read operations remain recipient-scoped; cross-user mark-read now returns 404 instead of false success. E2E verified an application notification is visible to its client only and remains unread after another user attempts access. Backend build, all 39 tests, and full SQLite E2E passed.
- Checkpoint: `4b36fe2` (`fix(notifications): enforce recipient ownership`).
- Review eligibility coverage: SQLite E2E confirmed both completed-contract participants can review each other, unrelated freelancers are rejected, and duplicate review submission returns 409.
- Checkpoint: `4b8ee68` (`test(reviews): cover reciprocal and duplicate eligibility`).
- Database setup verification: fresh disposable SQLite schema push and seed succeeded (6 users, 3 projects, 12 skills); both Prisma schemas validated. Independent `npm run prisma:generate` reproduces Windows `EPERM` replacing the query-engine DLL while a Node/tsx process holds it. PostgreSQL validation used a placeholder URL; no server was contacted.
- Checkpoint: `5b53d3f` (`docs(database): record local setup verification`).
- Frontend supply-chain upgrade: React Router 7.18.4, Vite 8.3.4, @vitejs/plugin-react 6.1.2, and Tailwind CSS 4.3.3 with its Vite plugin. Build passed; custom brand/slate utilities remain compiled; full frontend npm audit reports zero advisories. Backend Prisma audit still has three high-severity transitive advisories; audit-fix dry runs made no changes.
- Checkpoint: `046b2c5` (`chore(frontend): upgrade vulnerable build dependencies`).

## 2026-10-12 — Continued AWS readiness and verification

- Re-ran the current backend suite (9 files, 41 tests), backend TypeScript build, full disposable SQLite E2E, frontend TypeScript/production build, and both dependency audits. All builds/tests passed; frontend audit found zero vulnerabilities; backend audit still reports three high Prisma config/deepmerge advisories.
- Tightened S3 configuration so `STORAGE_DRIVER=s3` requires an explicit nonblank `S3_BUCKET_NAME`; added missing/valid bucket tests. This prevents misconfigured environments from silently selecting a generic bucket name.
- Reviewed AWS adapters and deployment readiness against the implemented code. AWS integration remains gated on successful Prisma Client regeneration and local Docker/PostgreSQL/Redis/MinIO smoke tests. No AWS account, credentials, or resources were used.
- Checkpoint: S3 fail-fast configuration and documentation update; pushed checkpoint recorded after commit.
- Prisma config dependency audit: applied an npm override scoped to `@prisma/config` for `deepmerge-ts@8.0.2`. Backend production audit now reports zero vulnerabilities. `npm ls` confirms the resolved version; both Prisma schemas validate, backend build, all 41 tests, and SQLite E2E pass. Prisma itself remains 6.19.3. Independent client generation remains unverified due the active Windows DLL lock.
- Expanded the disposable SQLite E2E authorization checks: public registration attempting `ADMIN` is rejected, and a suspended user's existing token and fresh login both receive `403`. Backend build and updated E2E passed.

## 2026-10-19 — Final completion and Free-plan assessment

- Reconciled the current branch and docs. `codex/talentcloud-audit` was clean at pushed checkpoint `221a8f1` before this documentation pass.
- Prisma Client generation succeeded once after confirming no project process was running. A backend `npm ci` then stalled at the Prisma `prisma -v` install hook when engine files were absent; `npm ci --ignore-scripts` installed the locked packages but left generated Prisma Client absent. An attempted clean reinstall in OneDrive also encountered `EBUSY` unlinking `cors/lib/index.js`. The follow-up backend build and tests therefore failed import because no PrismaClient was generated; this environment state is recorded accurately in `TESTING.md`.
- Frontend `npm ci` completed (92 packages, 0 vulnerabilities); frontend typecheck/production build passed. Backend audit after `npm ci --ignore-scripts` reported 0 vulnerabilities. The last complete backend verification remains the passing 41-test build/E2E checkpoint at `221a8f1`.
- Detected local PostgreSQL 18 Windows service on port 5432. A no-password `psql` connection attempt failed authentication; no credentials were guessed and no real PostgreSQL workflow was attempted.
- Updated AWS deployment guidance using current AWS Free plan documentation. The full managed stack is not a guaranteed zero-cost plan; local SQLite/local-files/in-memory-queue demonstration is the only verified zero-AWS-charge path. No AWS resources or charges.
- Current accepted pushed checkpoints: `fe302e1` (explicit S3 bucket), `143c761` (Prisma config advisory fix), `221a8f1` (auth negative E2E). This documentation checkpoint remains to commit and push after review.

## 2026-10-19 — Prisma clean install and upload dependency hardening

- Reproduced the backend install issue from a clean copy. `@prisma/client` postinstall invokes Prisma generation while npm lifecycle scripts run concurrently; the CLI fallback observed in npm output was an install-order race, not a TalentCloud Node process holding the query-engine DLL.
- Added `backend/.npmrc` with `foreground-scripts=true`. Plain `npm ci` passed in a clean copy outside OneDrive and in the actual checkout; no scripts were skipped. `npm run prisma:generate`, backend build, all 41 tests, and SQLite E2E passed afterward.
- Fresh disposable SQLite schema push and seed passed; the temporary database was removed. SQLite and PostgreSQL schemas validated; no live PostgreSQL connection was made.
- Upstream advisories/release notes showed Multer 1.x was affected by multipart denial-of-service issues. Upgraded to Multer 2.4.0; TypeScript build, all 41 tests, focused upload validation tests, SQLite E2E, and backend audit (zero vulnerabilities) passed. Frontend build and both dependency audits also passed.
- Added frontend ESLint configuration for TypeScript, React Hooks, and unused-variable checks; removed the reported unused imports/state. A fresh frontend `npm ci`, `npm run lint` (zero warnings), production build, and audit passed. Tracked-file scans found no `.env`, local database, private-key, or common credential-pattern files in the current tree.
- AWS resources remain unprovisioned. Docker/Compose, Redis, PostgreSQL application lifecycle, live S3/SQS, browser-driven E2E, and accessibility review remain outstanding.
- Backend install/security checkpoint: `cff323f` (`fix(backend): stabilize Prisma install and patch Multer`) pushed to `origin/codex/talentcloud-audit`.
- Frontend lint checkpoint: `fe49a31` (`chore(frontend): add strict lint checks`) pushed to `origin/codex/talentcloud-audit`.
- Local built API/Vite smoke on a disposable seeded SQLite database confirmed liveness, readiness, public project listing, SPA shell response, and CORS preflight. The test database and server processes were removed afterward; this was an HTTP smoke, not a browser-driven workflow.
- Documentation/demo checklist updates record the verified commands, demo workflow, account plan limits, and remaining blockers; this docs checkpoint is committed and pushed with this log.
