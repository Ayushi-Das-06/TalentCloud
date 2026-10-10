# Architectural Decision Records

## ADR 001: Local-first modular monorepo

- **Context:** The project must be easy to demonstrate without cloud credentials.
- **Decision:** Keep the React app, Express API, Prisma models, storage, and queue code in one TypeScript repository.
- **Consequence:** Local development can use SQLite, local files, and an in-memory queue. PostgreSQL and BullMQ/Redis are supported in the container topology. AWS SDK adapters support S3 and SQS, but require external AWS resources and have not been live-tested.

## ADR 002: Explainable matching over black-box AI

- **Context:** Matching should be deterministic, auditable, and usable without paid external APIs.
- **Decision:** Score normalized skills, experience, past performance, rating, availability, and budget compatibility using configurable weights.
- **Consequence:** Each result includes component scores, matched/missing skills, tier, and explanatory text. Tests can verify behavior without external services.

## ADR 003: Asynchronous resume processing

- **Context:** Parsing and analysis should not hold the upload request open.
- **Decision:** Store the file and queued resume record, then process extraction in the in-memory or BullMQ worker path.
- **Consequence:** The memory worker is process-local. BullMQ uses Redis and SQS uses a standard queue with a separate worker process. Failed SQS jobs are retained in the database for admin retry.

## ADR 004: Relational integrity

- **Context:** Applications, hiring, tasks, and reviews depend on related records and consistent state transitions.
- **Decision:** Use Prisma with relational constraints and transactions. A local SQLite schema and separate PostgreSQL schema are maintained.
- **Consequence:** Generate Prisma Client from the schema matching the selected database provider. The Docker image generates from the PostgreSQL schema.

## ADR 005: Private files and least-privilege endpoints

- **Context:** Resumes, project files, and operations dashboards can expose personal or business data.
- **Decision:** Require authentication and owner/participant checks for file downloads, task operations, project matching, and admin tools; avoid returning private attachment keys and unrelated contract data in public project responses.
- **Consequence:** Public discovery remains available while private workflow data is scoped to the signed-in participant.
