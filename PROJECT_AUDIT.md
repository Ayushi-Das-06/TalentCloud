# TalentCloud project audit

Last reviewed: 2026-10-20. This audit separates implementation, automated verification, local integration, and live cloud verification. No completion percentage is claimed.

## VERIFIED COMPLETE

- Local React/TypeScript frontend, Express/TypeScript API, Prisma schemas for SQLite and PostgreSQL, and existing marketplace modules were preserved.
- Authentication reloads account state on protected requests, rejects suspended users and invalid roles, and production rejects missing, short, or known development JWT/cookie secrets.
- SQLite E2E confirms public registration cannot assign `ADMIN`, and suspension immediately blocks both an existing token and new login.
- Authorization covers admin operations, project visibility/matching, task access, contract participants, file downloads/deletion, and completed-project review writes.
- Public discovery exposes open projects only. Public profile responses omit email and hide suspended profiles.
- Client project proposal listings are paginated with a validated page size capped at 50; the client proposal screen exposes next/previous page controls.
- Project cancellation atomically claims only an `OPEN` project owned by the requesting client, preventing a concurrent hire from leaving an active contract on a cancelled project.
- Application creation checks and claims an `OPEN` project within its transaction; hiring claims the proposal's `PENDING` state before creating a contract, and withdrawal is conditional on both owner and pending status.
- Notification list/read operations are recipient-scoped; marking another user's notification returns `404`, covered by the SQLite E2E journey.
- Completed-contract reviews are participant-only, support both directions, and reject duplicates; outsider and duplicate cases are covered by the SQLite E2E journey.
- Clients can save private drafts, publish their own drafts, and delete only empty drafts; related work/files block deletion. Draft publication and cancellation use state-conditional updates, and uploads require an open or active project.
- Request validation covers authentication, project create/update and discovery, application/hire/review/task/profile writes, supported route UUIDs, and upload metadata/content signatures.
- Limits cover login/registration, file uploads, and computational matching endpoints. They can use process-local memory or shared Redis fixed-window counters.
- Optional shared Redis fixed-window counters distribute those limits across API replicas; local development can continue using the in-memory default.
- Private local/S3 storage supports upload, retrieval, deletion, random keys, path containment, and membership/ownership checks. Local storage and mocked S3 upload/stream/buffer/delete behavior are unit tested.
- S3 mode fails startup when `S3_BUCKET_NAME` is absent or blank, avoiding a silent fallback to a generic bucket. Configuration tests cover both missing and explicit bucket cases.
- Resume parsing supports PDF, DOCX, TXT, and Markdown; suggestions are unverified until the freelancer confirms them in the dashboard.
- VERIFIED COMPLETE — Fixed resume ingestion to persist extracted skills only as analysis suggestions. SQLite E2E verifies the public profile has none of those skills before confirmation, while explicit confirmation adds a verified profile skill.
- Memory queue success, bounded retry, exhausted failure, and file-reference payload behavior are unit tested. BullMQ/SQS adapters and a standalone worker are implemented.
- Separate liveness and database readiness probes are available; the API container health check uses readiness so it does not report healthy while PostgreSQL is unavailable.
- Frontend role-based login redirect, profile editing, notification read/unread controls, resume status/skill confirmation, application/hiring, workspace tasks/files, matching, skill gap, and estimator flows are connected to existing APIs.
- Project attachment delete action works through the authorized API and storage abstraction.
- Freelancer discovery profile links now resolve to a public read-only profile detail page; profile edits use protected APIs.
- At pushed checkpoint `221a8f1`, backend build and 41 tests passed; disposable SQLite E2E passed, including role escalation/suspension checks, readiness, draft publication/deletion, paginated proposals, concurrent hire/withdrawal/cancellation consistency, private attachment access, worker processing, notification privacy, and reciprocal/duplicate reviews. Frontend build and both Prisma schema validations passed.
- Current regression run after the resume confirmation fix: backend build passed; 9 test files/41 tests passed; full SQLite E2E passed including the new unconfirmed-skill privacy assertion; frontend lint/build passed; frontend audit and both backend audits reported zero vulnerabilities.
- VERIFIED COMPLETE — Replaced unavailable MinIO images with the publicly pullable official RustFS `rustfs/rustfs:1.0.3` image (locally verified digest `sha256:9ca9559533b537d10482fe923288b676ad08f92a7069d9a17327fbae3cab688b`). The backend initializer probes RustFS readiness and uses S3 `HeadBucket`/`CreateBucket` with bounded retries; bucket creation is idempotent. Compose shares object-storage credentials and endpoint settings between RustFS, API, worker, and initializer. The old `minio_data` declaration remains, and RustFS uses a separate `rustfs_data` volume; no volumes were deleted.
- VERIFIED COMPLETE — `docker compose config --quiet` and `docker compose build api worker frontend object-storage-init` passed. API, worker, and initializer share one backend image. Backend build and 46 unit tests passed, SQLite E2E passed, frontend lint/build passed. PostgreSQL schema push and demo seed remain explicit commands. RustFS and its initializer were started; readiness, bucket initialization, and live adapter upload/download/delete passed. No existing volumes or databases were modified.
- Frontend `API_BASE=/api/v1`, Nginx same-origin `/api/` proxy to `api:5000`, published frontend port `8080:80`, and API CORS origin `http://localhost:8080` are consistent.
- Backend and frontend npm audits report zero vulnerabilities. Backend applies a scoped `@prisma/config` override to `deepmerge-ts@8.0.2`, and Multer is now 2.4.0; Prisma remains at 6.19.3. Re-evaluate these dependencies as upstream releases/advisories change.
- Backend `.npmrc` sets `foreground-scripts=true` to avoid the Prisma Client install-script race observed under npm 11 on Windows. Plain `npm ci` passed in a pristine copy and in this checkout; explicit `npm run prisma:generate`, backend build, all 41 tests, and SQLite E2E passed afterward.
- A fresh disposable SQLite database initialized and seeded successfully, then was removed. Both Prisma schemas validate. PostgreSQL schema validation used a placeholder URL; the local PostgreSQL service rejected no-password authentication, so live PostgreSQL app lifecycle is not verified.
- Local built API/Vite server smoke against a disposable seeded SQLite DB verified API liveness/readiness, project discovery response, frontend shell delivery, and CORS preflight. Full browser-driven user workflow remains unverified.
- A PostgreSQL 18 Windows service is running and listening on port 5432. A `psql -w` connection as `postgres` failed with `fe_sendauth: no password supplied`; no credentials were guessed and no real PostgreSQL app lifecycle was tested.
- The seeded `backend/prisma/dev.db` contains demo marketplace rows and password hashes. It is now excluded from the branch tip and ignored for future changes; the local working file is preserved. Existing Git history was not rewritten.
- Frontend `npm run lint` passes with zero warnings after removing unused imports/state; frontend clean install, typecheck, production build, and audit pass.
- Implementation checkpoints `cff323f` (Prisma install and Multer security) and `fe49a31` (frontend lint) were pushed to `origin/codex/talentcloud-audit`.

## IN PROGRESS

- Browser-driven E2E and accessibility review; wider authenticated-record pagination.
- Dockerfiles and Compose topology for frontend, API, independent worker, PostgreSQL, Redis/BullMQ, and RustFS S3-compatible storage, including private bucket initialization.
- PostgreSQL app lifecycle, AWS S3, and SQS execution paths beyond schema generation/build and adapter-level behavior; local RustFS S3 CRUD has been live-tested.
- Signal-driven API/worker shutdown and resume-job idempotency against live dependencies.
- Shared rate-limit store behavior is unit tested, but the Redis adapter has not been exercised against a live Redis server.
- PostgreSQL service lifecycle and migrations; the PostgreSQL schema validates/generates and the local API E2E was exercised against SQLite.
- File malware scanning/retention policy, infrastructure as code, observability dashboards, and recovery rehearsal.

## BLOCKED

- Docker Compose configuration and API/worker/frontend image builds are validated; full application startup and PostgreSQL/Redis/BullMQ integration remain unverified. RustFS file lifecycle smoke passed. Use the safe setup sequence in `README.md` without deleting volumes.
- Live AWS account-specific eligibility and adapter/deployment validation require AWS account access. No cloud resources have been provisioned.

Fresh SQLite initialization now works through `npm run prisma:push`, which creates an empty ignored file before Prisma applies the schema. Direct `prisma db push` against a nonexistent file returned a blank engine error in this environment.

## NOT STARTED

- ECS/Fargate, RDS, IAM, Secrets Manager, CloudWatch, alarms, backup/restore automation, and Terraform/CloudFormation templates.
- S3 presigned URLs (downloads currently stream through the authenticated API).
- Configured SQS dead-letter queue policy. Exhausted jobs are marked failed in the database for admin inspection/retry; production queue redrive settings must still be configured.
- Live Redis/BullMQ restart recovery, AWS SQS redrive, live object-store integration, and browser-driven E2E.

Application workflows listed above have meaningful SQLite E2E coverage. PostgreSQL lifecycle, Redis, Docker, browser/accessibility, and cloud deployment are not currently verified. `AWS_DEPLOYMENT.md` records Free-plan constraints and the local zero-AWS-cost demo option.
