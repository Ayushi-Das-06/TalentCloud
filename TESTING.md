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

## Verified locally (2026-10-10)

- Backend TypeScript build: passed.
- Both Prisma schemas validate and generate clients; the backend builds against generated PostgreSQL and SQLite clients.
- Backend test suite: 7 files, 30 tests passed. Coverage includes production secret config, public project visibility/query validation, auth rate limits, upload signatures, storage traversal/deletion, in-memory queue success/retry/exhaustion, intelligent features, DOCX/text parsing, and API access gates.
- `npm run prisma:push` successfully initialized a fresh ignored SQLite database using the empty-file helper. The seed script then ran against another disposable ignored database, producing 6 users, 3 projects, 2 applications, and 2 contracts.
- `npm run test:e2e` passed against a clean temporary SQLite database: registration, project creation, competing applications, concurrent hire with exactly one contract, task access, attachment upload/access/deletion, public visibility, resume upload/worker completion, skill confirmation, contract completion, and review.
- Frontend TypeScript check and production build: passed. Route-level splitting reduced the initial JavaScript chunk from 719.28 kB to 232.52 kB minified; Recharts is isolated in a 372.43 kB chunk. Both are below Vite's 500 kB advisory threshold.
- GitHub access check: authenticated fetch succeeded for the private repository. Before the implementation commit, `codex/talentcloud-audit` matched its upstream; after the commit, the verified commit was pushed as a fast-forward and local/upstream now point to the same revision.

## Not verified

- PostgreSQL service lifecycle and Docker images/Compose. Docker is unavailable here; the tested API lifecycle used disposable SQLite.
- Redis/BullMQ runtime and SQS/S3 live services. The in-memory resume worker was exercised end to end.
- Browser-driven E2E and accessibility review.
- Docker is not installed. AWS credentials/account are not available and no cloud resources were provisioned.
- S3 deletion uses the AWS SDK `DeleteObject` operation but has not been exercised against a live bucket.

## Dependency audit

- The first audit found critical and moderate advisories in the old Vitest 3 dependency tree. The test runner was upgraded to Vitest 5.0.3 and its current suite passes.
- Mammoth was evaluated for DOCX extraction, then removed because its `argparse`/`sprintf-js` dependency chain added a moderate advisory. DOCX extraction now reads `word/document.xml` from the DOCX ZIP using JSZip and has a fixture test.
- `npm audit --omit=dev` still reports 3 high severity advisories through Prisma 6.19.3 → `@prisma/config` → `deepmerge-ts`. Clearing this requires a compatible Prisma dependency update or upstream fix. No unreviewed override or forced ORM migration was applied.
- Direct Prisma `db push` returns a blank engine error when its SQLite target file does not exist in this Windows workspace. `npm run prisma:push` creates an empty file first and has been verified against a fresh disposable database. It does not overwrite an existing database file.
- The checked-in database contained seeded sample marketplace rows and password hashes, so it has been removed from the current branch snapshot and matching local database files are ignored. The local `backend/prisma/dev.db` remains in place; older Git history is unchanged.
