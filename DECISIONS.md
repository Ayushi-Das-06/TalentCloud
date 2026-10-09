# ARCHITECTURAL DECISION RECORDS (ADRs)

## Project: Cloud-Based Intelligent Freelancing and Project Marketplace

### ADR 001: Modular Monorepo Architecture with Pluggable Drivers
- **Context**: The application must run seamlessly both in a zero-dependency local development environment (without paid cloud services or mandatory local Docker/Redis setup) and in an enterprise AWS Cloud deployment (ECS Fargate, SQS, S3, RDS, ElastiCache).
- **Decision**: Adopt a modular TypeScript monorepo with an adapter pattern for queues (`QUEUE_DRIVER=bullmq|memory|sqs`) and file storage (`STORAGE_DRIVER=local|s3`).
- **Consequence**: Developers and viva examiners can boot and test the entire system instantly using built-in in-memory asynchronous workers or local disk storage, while having full production code ready for Redis/BullMQ and AWS SQS/S3.

### ADR 002: Explainable Intelligent Matching Engine Over Black-box AI
- **Context**: University evaluation requires clear, explainable, and testable matching logic that does not depend on paid external APIs or unpredictable LLM outputs.
- **Decision**: Implement a weighted multi-criteria scoring algorithm with canonical skill normalization (JS -> JavaScript, Postgres -> PostgreSQL, etc.), normalized experience heuristics, rating scales, availability factors, and budget overlap.
- **Consequence**: Every match produces an explainable breakdown (`skillScore`, `experienceScore`, `pastPerformanceScore`, `matchedSkills`, `missingSkills`) that can be displayed directly in the UI and verified via unit tests.

### ADR 003: Asynchronous Resume Parsing Pipeline with Independent Worker Scaling
- **Context**: Resume parsing and skill extraction can be computationally intensive and should not block user-facing HTTP request threads.
- **Decision**: Decouple resume ingestion from analysis. The API stores the document, registers a `Resume` record in `QUEUED` state, and pushes a job token to the queue. An autonomous worker picks up the job, extracts text, matches skills against a controlled dictionary, updates the database, and issues notifications.
- **Consequence**: High-volume uploads do not degrade API responsiveness. Demonstrates cloud scalability principles where workers can be independently scaled horizontally.

### ADR 004: Relational Data Model with PostgreSQL & Prisma ORM
- **Context**: Marketplace transactions (hiring, contracts, task assignments, reviews, atomic state transitions) require strict consistency, referential integrity, and ACID guarantees.
- **Decision**: Use PostgreSQL with Prisma ORM. Strict constraints prevent duplicate proposals, unauthorized reviews, and conflicting concurrent hires using transactions.
- **Consequence**: Clean, type-safe data access layer with reproducible migrations and deterministic seed scripts.
