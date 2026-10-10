# AWS Deployment Preparation

## Prepared locally

- PostgreSQL Prisma schema: `backend/prisma/schema.postgres.prisma`.
- AWS SDK adapters for S3 object storage and SQS queues. SQS uses a standard queue; failed jobs are stored in the database for admin retry.
- Container build definitions for frontend, API, and worker, with PostgreSQL and Redis services in `docker-compose.yml`.
- Production config rejects absent or short `JWT_SECRET` and `COOKIE_SECRET` values.

## Not implemented

The repository does not include Terraform/CloudFormation templates, ECS task definitions, IAM policies, CloudWatch dashboards/alarms, or production secret management. S3 and SQS SDK calls are implemented but were not tested against AWS. Docker Compose uses local file storage and BullMQ/Redis.

## No-cost next steps

1. Install Docker locally and verify `docker compose up --build`, then apply the PostgreSQL schema and seed only a disposable database.
2. Create an S3 bucket and standard SQS queue, configure IAM task roles, and validate the adapters in a sandbox account. Use IAM task roles instead of embedded AWS access keys.
3. Add infrastructure templates for ECS/Fargate, RDS PostgreSQL, S3, SQS with a dead-letter queue, ElastiCache Redis if BullMQ remains enabled, and CloudWatch.
4. Configure HTTPS, domain, CORS, JWT/cookie secrets, file limits/scanning, backups, retention, and alarms in a separate deployment environment.
5. Estimate AWS costs and obtain explicit account/budget approval before creating any resources.

No AWS credentials or account were available during this audit. No AWS resources were created and no charges were incurred.
