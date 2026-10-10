# Testing and Verification

## Commands

Run from the relevant package directory:

```powershell
# backend
npm run build
npm test

# frontend
npm run build
```

## Verified locally (2026-10-10)

- Backend TypeScript build: passed.
- Both Prisma schemas validate; the backend compiles against generated PostgreSQL and SQLite Prisma clients.
- Backend test suite: 3 files, 15 tests passed. Coverage includes matching, skill extraction, skill-gap analysis, estimate validation and outputs, text/DOCX parsing, unsupported resume formats, local storage traversal rejection, API health, and unauthenticated access rejection for admin, matching, file download, and project upload routes.
- Frontend production build: passed. Vite reports the generated main JavaScript chunk is about 700 kB minified, above its 500 kB advisory threshold.
- GitHub remote read check: authenticated `git ls-remote` succeeded for the private repository and returned the same `main` commit as the local checkout.

## Not verified

- Full registration-to-hire lifecycle against a freshly initialized database. The existing seed script wipes all records in its target database; do not run it against data that needs to be preserved.
- Prisma validates the SQLite schema, but `prisma db push` against a new ignored audit database fails with a blank `Schema engine error`; the tracked `backend/prisma/dev.db` was left untouched.
- Redis/BullMQ runtime, resume worker processing against a live database, Postgres container, Docker images/Compose, browser E2E, or AWS services.
- Docker is not installed. AWS credentials/account are not available and no cloud resources were provisioned.

## Dependency audit

- The first audit found critical and moderate advisories in the old Vitest 3 dependency tree. The test runner was upgraded to Vitest 5.0.3 and its current suite passes.
- Mammoth was evaluated for DOCX extraction, then removed because its `argparse`/`sprintf-js` dependency chain added a moderate advisory. DOCX extraction now reads `word/document.xml` from the DOCX ZIP using JSZip and has a fixture test.
- `npm audit --omit=dev` still reports 3 high severity advisories through Prisma 6.19.3 → `@prisma/config` → `deepmerge-ts`. Clearing this requires a compatible Prisma dependency update or upstream fix. No unreviewed override or forced ORM migration was applied.
