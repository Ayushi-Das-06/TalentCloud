# Development Log

## 2026-10-09 — Initial project scaffold

- Added the React frontend, Express/Prisma backend, SQLite and PostgreSQL schemas, seed data, and initial marketplace modules.
- Added architecture notes and a local infrastructure Compose file.

## 2026-10-10 — Repository access and implementation audit

- Confirmed local Codex mode, project path, clean `main` checkout, and read access to `origin/main` at the local commit. No remote changes were fetched or overwritten.
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

## Open work

- Complete integration/E2E coverage, actual Docker/AWS deployment validation, and resolve the Prisma config dependency advisories.
- Resolve remaining Prisma config dependency advisories through a compatible, verified Prisma upgrade.
