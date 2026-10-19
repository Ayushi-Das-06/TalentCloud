# TalentCloud project audit

Last reviewed: 2026-10-19. This audit separates implementation, automated verification, local integration, and live cloud verification. No completion percentage is claimed.

## Complete and tested

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
- Private local/S3 storage supports upload, retrieval, deletion, random keys, path containment, and membership/ownership checks. Local storage behavior and deletion are tested.
- S3 mode fails startup when `S3_BUCKET_NAME` is absent or blank, avoiding a silent fallback to a generic bucket. Configuration tests cover both missing and explicit bucket cases.
- Resume parsing supports PDF, DOCX, TXT, and Markdown; suggestions are unverified until the freelancer confirms them in the dashboard.
- Memory queue success, bounded retry, exhausted failure, and file-reference payload behavior are unit tested. BullMQ/SQS adapters and a standalone worker are implemented.
- Separate liveness and database readiness probes are available; the API container health check uses readiness so it does not report healthy while PostgreSQL is unavailable.
- Frontend role-based login redirect, profile editing, notification read/unread controls, resume status/skill confirmation, application/hiring, workspace tasks/files, matching, skill gap, and estimator flows are connected to existing APIs.
- Project attachment delete action works through the authorized API and storage abstraction.
- Freelancer discovery profile links now resolve to a public read-only profile detail page; profile edits use protected APIs.
- At pushed checkpoint `221a8f1`, backend build and 41 tests passed; disposable SQLite E2E passed, including role escalation/suspension checks, readiness, draft publication/deletion, paginated proposals, concurrent hire/withdrawal/cancellation consistency, private attachment access, worker processing, notification privacy, and reciprocal/duplicate reviews. Frontend build and both Prisma schema validations passed.
- Backend and frontend npm audits report zero vulnerabilities. Backend applies a scoped `@prisma/config` override to `deepmerge-ts@8.0.2`; Prisma remains at 6.19.3 and schema validation, build, tests, and E2E pass. Re-evaluate the override when Prisma updates its dependency pin.
- On 2026-10-19, with no TalentCloud process running, Prisma Client generation succeeded once from the preinstalled dependencies. A later clean-install check left Prisma Client unavailable: normal backend `npm ci` stalled at Prisma's `prisma -v` install hook; `npm ci --ignore-scripts` succeeded but does not generate the client. The subsequent backend build and two test suites failed to import because `@prisma/client` had no generated `PrismaClient`. This is an install environment blocker after that clean-install experiment, not evidence of a code regression at the previously verified commit.
- A PostgreSQL 18 Windows service is running and listening on port 5432. A `psql -w` connection as `postgres` failed with `fe_sendauth: no password supplied`; no credentials were guessed and no real PostgreSQL app lifecycle was tested.
- The seeded `backend/prisma/dev.db` contains demo marketplace rows and password hashes. It is now excluded from the branch tip and ignored for future changes; the local working file is preserved. Existing Git history was not rewritten.
- Changes are committed on `codex/talentcloud-audit` and pushed without modifying `main`.

## Implemented but not tested

- Dockerfiles and Compose topology for frontend, API, independent worker, PostgreSQL, Redis/BullMQ, and MinIO/S3-compatible storage, including private bucket initialization.
- PostgreSQL, S3, and SQS execution paths beyond schema generation/build and adapter-level behavior.
- Signal-driven API/worker shutdown and resume-job idempotency against live dependencies.
- Shared rate-limit store behavior is unit tested, but the Redis adapter has not been exercised against a live Redis server.
- PostgreSQL service lifecycle and migrations; the PostgreSQL schema validates/generates and the local API E2E was exercised against SQLite.

## In progress

- Broader API edge-case integration, browser-driven E2E, and PostgreSQL lifecycle coverage.
- Accessibility review and pagination for other authenticated record-list endpoints. Project proposals now have validated, capped pagination.
- File malware scanning/retention policy, infrastructure as code, observability dashboards, and recovery rehearsal.
- Clean backend reinstall and Prisma engine/client generation after reinstall remain blocked at the Prisma install hook.

## Blocked by user action

- Docker/Compose validation requires Docker Desktop installed locally. Then run the Docker setup commands in `README.md`.
- Live AWS adapter/deployment validation requires an AWS account and credentials or IAM roles. No cloud resources have been provisioned.

Fresh SQLite initialization now works through `npm run prisma:push`, which creates an empty ignored file before Prisma applies the schema. Direct `prisma db push` against a nonexistent file returned a blank engine error in this environment.

## Not implemented

- ECS/Fargate, RDS, IAM, Secrets Manager, CloudWatch, alarms, backup/restore automation, and Terraform/CloudFormation templates.
- S3 presigned URLs (downloads currently stream through the authenticated API).
- Configured SQS dead-letter queue policy. Exhausted jobs are marked failed in the database for admin inspection/retry; production queue redrive settings must still be configured.
- Live Redis/BullMQ restart recovery, AWS SQS redrive, live object-store integration, and browser-driven E2E.

Application workflows listed above have meaningful SQLite E2E coverage. Clean backend reinstall, PostgreSQL lifecycle, Redis, Docker, browser/accessibility, and cloud deployment are not currently verified. `AWS_DEPLOYMENT.md` records Free-plan constraints and the local zero-AWS-cost demo option.
