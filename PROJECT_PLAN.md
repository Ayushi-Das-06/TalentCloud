# TalentCloud Implementation Audit

Last audited: 2026-10-10. “Implemented” means present in the repository; “verified” means exercised by the local build or tests noted in `TESTING.md`. Detailed statuses are in `PROJECT_AUDIT.md`.

## Foundation

- [x] Local workspace access, runtime, repository docs, Git branch, and private GitHub read access verified.
- [x] Frontend and backend TypeScript projects and lockfiles exist.
- [x] SQLite local schema, PostgreSQL schema, seed script, and development Compose stack exist.
- [x] Dockerfiles and API, worker, frontend, PostgreSQL, Redis, and MinIO Compose services added; Docker is unavailable here, so image/compose validation is pending.

## Database and identity

- [x] Prisma models cover users, profiles, skills, resumes, projects, applications, contracts, tasks, reviews, notifications, files, and background jobs.
- [x] Seed script provides client, freelancer, admin, projects, applications, skills, and demonstration records. It clears the configured database before reseeding.
- [x] VERIFIED COMPLETE — A clean disposable SQLite database was initialized with `npm run prisma:push`, seeded, and counted (6 users, 3 projects, 12 skills); the temp database was removed. SQLite and PostgreSQL schemas both validate (PostgreSQL used a placeholder URL, no server connection). Commit: `5b53d3f`.
- [ ] BLOCKED — `npm run prisma:generate` fails on Windows with `EPERM` replacing `backend/node_modules/.prisma/client/query_engine-windows.dll.node` because an active Node/tsx process has that DLL loaded. Stop the TalentCloud process using it and rerun generation; if the lock persists, use a workspace outside OneDrive. The existing generated client still builds and ran the local E2E suite.
- [x] Registration, login, current-user, and logout endpoints; client/freelancer/admin authorization; protected admin endpoints.
- [x] React login/register state and protected routes.
- [ ] Broader API integration coverage for suspension, ownership edge cases, and role escalation; focused regressions and a SQLite lifecycle smoke cover core behavior.

## Security verification status

- [x] VERIFIED COMPLETE — Production startup rejects missing, short, and known development JWT/cookie secrets; cookie settings are `httpOnly`, production-secure, and `SameSite=Lax`. Config tests passed (5 tests). Limitation: production behavior was validated through config/code tests, not deployed behind a real HTTPS proxy.
- [x] VERIFIED COMPLETE — Public project discovery/detail cannot request the client user's email, and unauthenticated users cannot list drafts or fetch non-open project details. Project visibility/privacy regression suite passed (6 tests). Commit: `57ed2ca`. Client/admin visibility relies on ownership-filtered queries and route authorization.
- [x] VERIFIED COMPLETE — Current tracked-file review found no credential-pattern matches and no tracked local SQLite database or private key files. `.env.example` is the only tracked environment file; `.env` and local databases are ignored. Check: `git ls-files`, `git grep -Il` credential patterns, and `git check-ignore`. Limitation: this reviewed the current checkout, not every historical Git object; a dedicated secret scanner is still advisable.
- [ ] BLOCKED — Shared Redis rate limiting is implemented with atomic Redis counters, TLS URL validation, and a local in-memory fallback when Redis is not configured. Redis-store/config tests (7 tests) and API security tests (7 tests) pass. A live Redis-backed HTTP test is not run: this environment has no Redis server or Docker, and localhost:6379 is unreachable. Verify with the Compose Redis service or a secured Redis instance before marking this item complete.

## Marketplace workflows

- [x] Freelancer and client profile APIs, skill management, project creation/editing/discovery, proposals, hiring, contract completion, tasks, reviews, and notifications are implemented.
- [x] VERIFIED COMPLETE — Clients can save private project drafts, publish only their own drafts, and delete only empty drafts. Draft publication/cancellation and all project edits claim the observed state atomically; active/published projects cannot be destructively deleted. Dashboard and create-project UI expose these workflows. Checks: backend build; 9 test files/39 tests; full SQLite E2E including draft visibility, publish role protection, safe deletion, and published-project deletion rejection; frontend production build. Commit: `6551fc5`. Limitation: deleting drafts with any related work/files is intentionally rejected; open projects are cancelled instead.
- [x] Hiring uses a database transaction to accept one application, reject competitors, create a contract, initialize a task, and notify participants.
- [x] VERIFIED COMPLETE — Application submission is serialized against project state changes; hiring atomically claims a `PENDING` application inside the contract transaction, and withdrawal only transitions an owned `PENDING` application. E2E covers simultaneous withdrawal/hiring and verifies consistent final state, plus rejects another freelancer's withdrawal. Checks: backend build, all 39 backend tests, SQLite E2E. Commit: `49c57b4`. Limitation: exercised with SQLite; PostgreSQL race behavior remains unverified.
- [x] VERIFIED COMPLETE — Notifications are listed and marked read only within the authenticated recipient's scope; non-recipient mark-as-read returns `404`. E2E checks client application notices are private and unchanged after a cross-user mark-read attempt. Checks: backend build, all 39 backend tests, SQLite E2E. Commit: `4b36fe2`.
- [x] VERIFIED COMPLETE — Reviews are limited to participants of a completed contract; both participants may review one another and the database uniqueness rule prevents duplicate project/reviewer/reviewee entries. E2E covers reciprocal reviews, outsider rejection, and duplicate rejection. Check: full SQLite E2E passed. Commit: `4b8ee68`.
- [x] VERIFIED COMPLETE — Cancellation and hiring cannot commit conflicting project/contract states. Cancellation atomically updates only a client-owned `OPEN` project; the SQLite E2E race verifies either cancellation wins with no contract or hiring wins with an active contract and cancellation conflict. Checks: backend build, all 37 backend tests, and E2E smoke passed. Commit: `83b4b5d`. Limitation: concurrency was exercised against SQLite locally; PostgreSQL concurrency remains unverified.
- [x] Task reads and writes check project membership; status changes validate allowed states; task deletion is client-owner/admin only.
- [x] Review submission is limited to completed-contract participants and validates ratings and feedback.
- [x] Clean disposable SQLite registration-to-review E2E and concurrent hiring smoke; PostgreSQL lifecycle remains unverified.
- [x] In-app notification dropdown supports read/unread and mark-all-read actions; notification links now target existing routes.
- [ ] Bidirectional client/freelancer review completeness and richer notification delivery.

## Files and intelligent features

- [x] Local/S3 storage adapters support private file retrieval with ownership checks and path containment.
- [x] Resume upload is authenticated, limited to 10 MB, and restricted to PDF, DOCX, TXT, and Markdown.
- [x] Resume analysis extracts text from PDF, DOCX, and text files and queues skill analysis.
- [x] Project/task attachment upload, task-level file links, and authorized deletion with local/S3 storage cleanup.
- [ ] Presigned S3 downloads; current API streams objects through authenticated routes.
- [x] Explainable weighted freelancer/project matching, canonical skill aliases, skill-gap analysis, and budget/deadline estimation.
- [x] Client matching is restricted to the project owner or admin; freelancer recommendations are private to the signed-in freelancer.
- [x] DOCX extraction has a parser regression fixture.
- [x] Resume suggestions remain unverified until a freelancer confirms each skill in the dashboard; profile editing is available to clients and freelancers.

## Background work and operations

- [x] In-memory async queue for local development, BullMQ/Redis, and Amazon SQS enqueue/worker support.
- [x] BullMQ and SQS workers run separately; retries and failed-job inspection/retry are supported.
- [x] SQS retries and failed-job persistence in the database for admin retry; queue, IAM, and external DLQ policies remain deployment configuration.
- [x] Admin queue and system dashboards; all admin endpoints require the ADMIN role.
- [x] In-memory queue success/retry/exhaustion tests; resume handler includes completed-job idempotence and failed-status recording.
- [ ] Load/burst and process-restart recovery test against Redis.

## Dependency security

- [x] VERIFIED COMPLETE — Frontend dependencies updated to React Router 7.18.4, Vite 8.3.4, and Tailwind CSS 4.3.3 with the Vite integration. TypeScript/production build passes and `npm audit` reports zero frontend advisories. Commit: `046b2c5`.
- [ ] BLOCKED — Backend `npm audit --omit=dev` reports three high-severity entries through Prisma 6.19.3 → `@prisma/config` → `deepmerge-ts` 7.1.5. Safe and forced audit-fix dry runs make no changes. The available remedy requires a Prisma major migration; no override was applied because the supported upgrade changes client generation, database adapters/configuration, and SQLite/PostgreSQL setup. Complete a tested Prisma migration before deployment.

## Frontend and quality

- [x] Landing, discovery, project details, client/freelancer dashboards, proposal review, workspace with task attachments, skill-gap, estimator, and admin queue screens exist.
- [x] Frontend production build passes with route-level code splitting. The initial JavaScript chunk is about 233 kB; the Recharts chunk is about 372 kB.
- [x] Backend TypeScript build passes; current test count is recorded in `TESTING.md`.
- [ ] Browser-driven end-to-end coverage and accessibility review.
- [ ] BLOCKED — Frontend dependency audit is clean; the backend audit retains three high-severity Prisma config dependency advisories. See `Dependency security` and `TESTING.md`.

## Cloud deployment

- [x] PostgreSQL Prisma schema and local Docker Compose topology prepared for API, worker, frontend, PostgreSQL, Redis, and MinIO.
- [ ] Docker image build and compose smoke test (Docker is not installed in the audited environment).
- [x] S3 and SQS SDK adapters and environment configuration prepared.
- [ ] ECS/Fargate, RDS, ElastiCache, CloudWatch, IAM policies, secrets management, and deployment templates.
- [ ] Live AWS validation. No AWS account or credentials were available, and no resources were provisioned.
