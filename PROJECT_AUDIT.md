# TalentCloud project audit

Last reviewed: 2026-10-10. Completion estimates are approximate, based on the requested scope and verified repository state. “Complete and tested” means locally exercised by the documented build or test; adapters requiring live infrastructure are not counted as tested.

## Complete and tested

- Local React/TypeScript frontend, Express/TypeScript API, Prisma schemas for SQLite and PostgreSQL, and existing marketplace modules were preserved.
- Authentication reloads account state on protected requests, rejects suspended users and invalid roles, and production rejects missing, short, or known development JWT/cookie secrets.
- Authorization covers admin operations, project visibility/matching, task access, contract participants, file downloads/deletion, and completed-project review writes.
- Public discovery exposes open projects only. Public profile responses omit email and hide suspended profiles.
- Request validation covers authentication, project create/update and discovery, application/hire/review/task/profile writes, supported route UUIDs, and upload metadata/content signatures.
- Per-process limits cover login/registration, file uploads, and computational matching endpoints.
- Private local/S3 storage supports upload, retrieval, deletion, random keys, path containment, and membership/ownership checks. Local storage behavior and deletion are tested.
- Resume parsing supports PDF, DOCX, TXT, and Markdown; suggestions are unverified until the freelancer confirms them in the dashboard.
- Memory queue success, bounded retry, exhausted failure, and file-reference payload behavior are unit tested. BullMQ/SQS adapters and a standalone worker are implemented.
- Frontend role-based login redirect, profile editing, notification read/unread controls, resume status/skill confirmation, application/hiring, workspace tasks/files, matching, skill gap, and estimator flows are connected to existing APIs.
- Project attachment delete action works through the authorized API and storage abstraction.
- Freelancer discovery profile links now resolve to a public read-only profile detail page; profile edits use protected APIs.
- Backend build and 30 backend tests pass; a clean, disposable SQLite registration-to-review E2E smoke passes. Frontend type check and production build pass. Both Prisma schemas validate and generate clients.
- The seeded `backend/prisma/dev.db` contains demo marketplace rows and password hashes. It is now excluded from the branch tip and ignored for future changes; the local working file is preserved. Existing Git history was not rewritten.
- Changes are committed on `codex/talentcloud-audit` and pushed without modifying `main`.

## Implemented but not tested

- Dockerfiles and Compose topology for frontend, API, independent worker, PostgreSQL, Redis/BullMQ, and MinIO/S3-compatible storage, including private bucket initialization.
- PostgreSQL, S3, and SQS execution paths beyond schema generation/build and adapter-level behavior.
- Signal-driven API/worker shutdown and resume-job idempotency against live dependencies.
- Production rate limits across replicas; the current Express store is process-local.
- PostgreSQL service lifecycle and migrations; the PostgreSQL schema validates/generates and the local API E2E was exercised against SQLite.

## In progress

- Broader API edge-case integration, browser-driven E2E, and PostgreSQL lifecycle coverage.
- Accessibility review and API pagination consistency outside public discovery.
- Production-grade distributed rate limiting, file malware scanning/retention policy, infrastructure as code, observability dashboards, and recovery rehearsal.
- Compatible fix for remaining Prisma dependency advisories.

## Blocked by user action

- Docker/Compose validation requires Docker Desktop installed locally. Then run the Docker setup commands in `README.md`.
- Live AWS adapter/deployment validation requires an AWS account and credentials or IAM roles. No cloud resources have been provisioned.

Fresh SQLite initialization now works through `npm run prisma:push`, which creates an empty ignored file before Prisma applies the schema. Direct `prisma db push` against a nonexistent file returned a blank engine error in this environment.

## Not implemented

- ECS/Fargate, RDS, IAM, Secrets Manager, CloudWatch, alarms, backup/restore automation, and Terraform/CloudFormation templates.
- S3 presigned URLs (downloads currently stream through the authenticated API).
- Configured SQS dead-letter queue policy. Exhausted jobs are marked failed in the database for admin inspection/retry; production queue redrive settings must still be configured.
- Live Redis/BullMQ restart recovery, AWS SQS redrive, object-store integration, browser E2E, and clean-database end-to-end hire flow.

## Current estimate

Approximately **80–85% of the requested application implementation** is present. Local SQLite lifecycle coverage passes and route-level splitting brings the initial JavaScript chunk below the Vite advisory threshold. Docker execution, PostgreSQL lifecycle, browser E2E, and AWS infrastructure remain unverified or absent. This is an engineering estimate, not a measured test-coverage percentage.
