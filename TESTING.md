# Testing and Verification

## Commands

Run from the relevant package directory:

```powershell
# backend
npm run build
npm test
npm run test:e2e

# frontend
npm run build
```

## Verified locally (2026-10-12)

- Backend TypeScript build: passed.
- SQLite and PostgreSQL Prisma schemas validate; PostgreSQL validation used a placeholder URL and did not connect to a server. Backend build passes against the checked/generated client. Regenerating the SQLite Prisma client currently fails with Windows `EPERM` replacing the query-engine DLL while an active Node/tsx process has it loaded; stop that process and rerun `npm run prisma:generate`.
- Backend test suite: 9 files, 41 tests passed. Coverage includes production, Redis, and S3 config validation, public project privacy/visibility/query validation, pagination limits, shared Redis counter key/expiry behavior, auth rate limits, upload signatures, storage traversal/deletion, in-memory queue retry behavior, intelligent features, document parsing, and API access gates.
- `npm run prisma:push` synchronized a fresh disposable SQLite database and `npm run seed` populated 6 users, 3 projects, and 12 skills. A Prisma client regeneration warning occurred during `db push` because of the active DLL lock; seeding succeeded with the existing client. The disposable database was removed.
- `npm run test:e2e` passed against a clean temporary SQLite database using the in-memory rate-limit fallback: readiness, registration role escalation denial, suspended-session/login denial, draft privacy/publication/deletion, proposals and pagination, concurrent hiring/withdrawal/cancellation consistency, task access, attachment upload/access/deletion, resume worker/skill confirmation, contract completion, notification privacy, and reciprocal/duplicate review behavior.
- Frontend TypeScript check and production build: passed with Vite 8.3.4, React Router 7.18.4, and Tailwind CSS 4.3.3. The initial JavaScript chunk is 231.14 kB minified; Recharts is isolated in a 367.64 kB chunk.
- GitHub access check: authenticated fetch succeeded for the private repository. Before the implementation commit, `codex/talentcloud-audit` matched its upstream; after the commit, the verified commit was pushed as a fast-forward and local/upstream now point to the same revision.

## Not verified

- PostgreSQL service lifecycle and Docker images/Compose. Docker is unavailable here; the tested API lifecycle used disposable SQLite.
- Shared Redis rate-limit behavior against a running Redis instance. The fixed-window store is unit tested with a fake Redis client; local Compose wires the API to Redis.
- Prisma client regeneration in this Windows workspace remains blocked while an active Node process holds the engine DLL.
- Redis/BullMQ runtime and SQS/S3 live services. The in-memory resume worker was exercised end to end.
- Browser-driven E2E and accessibility review.
- Docker is not installed. AWS credentials/account are not available and no cloud resources were provisioned.
- S3 deletion uses the AWS SDK `DeleteObject` operation but has not been exercised against a live bucket.
- The S3 adapter now requires an explicit bucket name at startup; empty and valid S3 bucket configuration cases are covered by unit tests.

## Dependency audit

- The first audit found critical and moderate advisories in the old Vitest 3 dependency tree. The test runner was upgraded to Vitest 5.0.3 and its current suite passes.
- Mammoth was evaluated for DOCX extraction, then removed because its `argparse`/`sprintf-js` dependency chain added a moderate advisory. DOCX extraction now reads `word/document.xml` from the DOCX ZIP using JSZip and has a fixture test.
- Backend `npm audit`, backend `npm audit --omit=dev`, and frontend `npm audit` all report zero vulnerabilities. Backend uses a scoped npm override for `@prisma/config` to `deepmerge-ts@8.0.2`, the patched major. Prisma 6.19.3 remains unchanged; schema validation, backend build, all tests, and SQLite E2E passed after applying the override. Recheck when Prisma updates its pinned config dependency.
- Frontend and backend dependency audits are clean. The backend advisory was resolved with a narrowly scoped dependency override and verified against the app's Prisma validation and local test suite; this does not upgrade Prisma itself.
- Direct Prisma `db push` returns a blank engine error when its SQLite target file does not exist in this Windows workspace. `npm run prisma:push` creates an empty file first and has been verified against a fresh disposable database. It does not overwrite an existing database file.
- The checked-in database contained seeded sample marketplace rows and password hashes, so it has been removed from the current branch snapshot and matching local database files are ignored. The local `backend/prisma/dev.db` remains in place; older Git history is unchanged.
