# AWS Deployment Preparation

## Prepared locally

- PostgreSQL Prisma schema: `backend/prisma/schema.postgres.prisma`.
- AWS SDK adapters for private S3 object storage and SQS queue processing. SQS uses a standard queue; exhausted jobs are stored in the database for admin inspection/retry.
- Container definitions for the frontend, API, and independent worker. Local Compose connects PostgreSQL, Redis/BullMQ, and MinIO/S3-compatible storage.
- Production configuration rejects missing, short, or known development JWT and cookie secrets.
- Local SQLite initialization and disposable end-to-end workflows are available without cloud credentials.
- The frontend now uses route-level lazy loading; the initial bundle and chart bundle are each below Vite's 500 kB advisory threshold.

## AWS integration readiness gate

The AWS phase should begin after Docker Compose has been run successfully on a machine with Docker Desktop, and the PostgreSQL/Redis/MinIO local stack has passed the documented smoke checks. That validates container startup and the PostgreSQL-backed app before cloud infrastructure introduces another source of failure. Docker is not installed in the current workspace, so that gate is still open.

The first step after the gate is a no-provisioning infrastructure review: choose a target AWS region, estimate recurring costs, and review the proposed service boundaries and access policies. Only after that review should any AWS resources be created. No AWS account, credentials, or resources were available or used during this audit.

## What you will need to do when the gate is reached

1. Create or select the AWS account and choose a deployment region. Enable MFA on the root user, add a billing budget/alert, and do not create root access keys.
2. Create an IAM Identity Center user/permission set or an equivalent least-privilege deployment role. Configure AWS CLI SSO locally with `aws configure sso` and `aws sso login`; do not paste credentials or secrets into chat or commit them.
3. Give the deployment role permissions for the reviewed resources and tell me the account ID, region, and monthly budget ceiling. The account ID is not a secret; access keys are.
4. Review the deployment plan and cost estimate before authorizing a first deployment. At that point, connect the local AWS CLI session and explicitly authorize provisioning. Until then, work stays local.
5. Use task roles for running services, not static access keys. Store JWT/cookie secrets in Secrets Manager, keep the S3 bucket private, use an SQS dead-letter queue and retention/redrive policy, enable RDS backups, and configure CloudWatch alarms/log retention.

## Intended first AWS architecture

- ECS Fargate services for the API and worker, plus a static frontend behind an HTTPS load balancer or CDN.
- RDS PostgreSQL for application data.
- Private S3 bucket for uploaded files, with lifecycle/retention policy and encryption.
- SQS standard queue with a dead-letter queue for resume-analysis jobs. The current SQS adapter should be selected instead of also operating Redis/BullMQ in the first AWS deployment.
- Secrets Manager for production secrets, IAM task roles with least privilege, and CloudWatch logs/alarms.

The repository does not yet include reviewed Terraform/CloudFormation templates, ECS task/service definitions, IAM policies, dashboards/alarms, or an automated backup/restore rehearsal. AWS S3/SQS code has not been exercised against live services. Do not treat this document as a deployable production stack.

## Verification limits

- Docker image and Compose validation is pending because Docker is unavailable here.
- PostgreSQL lifecycle testing, S3/SQS live calls, ECS deployment, HTTPS/domain setup, and failure recovery require infrastructure access and have not been attempted.
- No AWS resources have been provisioned; no cloud charges have been incurred.
