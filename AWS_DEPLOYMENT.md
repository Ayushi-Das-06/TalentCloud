# AWS Deployment Preparation

## Prepared locally

- PostgreSQL Prisma schema: `backend/prisma/schema.postgres.prisma`.
- AWS SDK adapters for private S3 object storage and SQS queue processing. SQS uses a standard queue; exhausted jobs are stored in the database for admin inspection/retry.
- Container definitions for the frontend, API, and independent worker. Local Compose connects PostgreSQL, Redis/BullMQ, and RustFS S3-compatible storage.
- Production configuration rejects missing, short, or known development JWT and cookie secrets.
- Local SQLite initialization and disposable end-to-end workflows are available without cloud credentials.
- The frontend now uses route-level lazy loading; the initial bundle and chart bundle are each below Vite's 500 kB advisory threshold.

## AWS integration readiness gate

Begin AWS integration only after the local backend install/generation/build/test gate and the Docker Compose PostgreSQL, Redis-backed rate-limit/queue, and RustFS upload/download/delete smoke checks pass. Current backend build, unit tests, SQLite E2E, Compose validation, and API/worker/frontend image builds pass. RustFS readiness, bucket initialization, and a live S3 adapter upload/download/delete smoke pass locally. The full API/worker/frontend stack and PostgreSQL/Redis Compose integration have not been started or verified. No AWS integration should be started under the current zero-charge constraint; the account plan and service eligibility cannot be inspected here, and the proposed managed stack is not guaranteed to cost $0. The local demo does not need AWS.

Once the gate passes, the first step is a no-provisioning infrastructure review: choose a target AWS region, estimate recurring costs, and review the proposed service boundaries and access policies. Then prepare the AWS account security and billing safeguards below. Provisioning remains a separate explicit step after cost and architecture review. No AWS account, credentials, or resources were available or used during this audit.

## Free account plan assessment (checked 2026-10-19)

AWS describes the Free account plan as a limited proof-of-concept plan: no AWS bill unless the account is upgraded or a paid-only service is activated, access is restricted to selected services, and the plan ends when credits are exhausted or six months elapse. AWS says the account then closes; resources/data are retained for 90 days before permanent deletion. It is not a permanent free hosting commitment. Free-plan usage can consume the initial $100 and up to $100 of earned credits; those credits are not an ongoing monthly allowance. AWS Budgets and alerts are notifications, not a hard spending cap. See [AWS Free Tier plan comparison](https://aws.amazon.com/free/), [AWS plan rules](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html), and [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/).

AWS currently lists EC2 instances (including T3/T4g micro and small sizes), S3, and PostgreSQL RDS micro instances as eligible to explore using credits on Free and Paid plans. This does not establish that every feature, region, networking component, or this specific account is eligible. See [EC2 offer details](https://aws.amazon.com/free/compute/), [S3 offer details](https://aws.amazon.com/free/storage/), and [RDS offer details](https://aws.amazon.com/rds/free/). The account console's service eligibility must be checked before acting.

| Component in the proposed stack | Current AWS pricing/eligibility evidence | Status for this project |
| --- | --- | --- |
| EC2 single-host compute | Eligible selected instance types are explored using credits on both plans. EBS, public IPv4, outbound transfer, and other attached services must be included. | Account/region eligibility not checked; no host created. |
| ECS/Fargate | ECS has no orchestration fee, but Fargate compute is billed by vCPU/memory/time. | Not established as Free-plan eligible for this account; not suitable to promise zero charge. |
| RDS PostgreSQL | AWS lists db.t3.micro/db.t4g.micro on Free plan; RDS restrictions include Single-AZ. Storage, backups, and other usage must be checked. | Plan offer exists; region/account/usage not verified; no DB created. |
| S3 private file storage | Listed for credit-based exploration; storage, requests, and transfer are usage costs. | Offer exists; account/region/usage not verified; no bucket created. |
| SQS | AWS lists 1 million requests/month as Always Free on Free and Paid plans. | Published allowance exists; queue/DLQ and account access not verified; no queue created. |
| Application Load Balancer | Hourly load balancer and capacity-unit usage are billed. | Exclude from a $0 architecture. |
| NAT Gateway | Charged per availability hour and per GB processed. | Exclude from a $0 architecture. |
| Secrets Manager | Charges per stored secret and API calls; Free plan credits may apply where eligible. | No secrets created; exact eligibility/cost not checked. |
| CloudWatch | Some Free Tier usage exists; log ingestion and retention can incur usage charges. | No logs/alarms configured; usage estimate unavailable. |
| Route 53/custom domain | DNS hosted zones, queries, and domain registration have separate pricing. | No domain/service created; exclude from a guaranteed $0 estimate. |
| IAM roles | IAM is an access-control prerequisite, not compute/storage. | Future setup only; no role created. |

These offer pages describe plan-level eligibility/allowances, not the state of the user's account. AWS documents [SQS's Always Free offer](https://aws.amazon.com/free/application-integration/), [load balancer pricing](https://aws.amazon.com/elasticloadbalancing/pricing/), and [NAT hourly/data processing charges](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html). A calculator estimate still needs a region, architecture sizes, uptime, data and request volumes, retention, and egress assumptions.

| Option | Plan/cost assessment | Decision |
| --- | --- | --- |
| Existing ECS/Fargate + RDS + S3 + SQS proposal | ECS orchestration itself has no fee, but Fargate charges for requested compute; the full design also introduces networking, logs, storage, and data transfer charges/credit use. Current account eligibility and a region/traffic-specific estimate are unknown. | Do not provision under a hard zero-charge requirement. An exact total cannot be quoted without region, task sizes/runtime, storage, request/egress volumes, and log retention. |
| Single EC2 demo host | AWS lists selected EC2 instance types as available to explore using Free plan credits. EBS, public IPv4, transfer, and other use still consume credits; the Free plan expires/closes, so this is not a lasting host. | Potential temporary experiment only, after account-console eligibility and complete cost/credit estimate review. Not approved or tested. |
| Local laptop demonstration | Uses the local SQLite, local file storage, and in-memory queue paths; AWS spend is $0. Docker is optional for this path. It is not publicly reachable or highly available. | The only verified zero-AWS-charge option; app flows are covered by disposable SQLite E2E. Docker Compose config/images build, but runtime has not been verified. |

Do not upgrade the account to gain service access. Do not create resources for the application under the current zero-charge requirement. The current evidence is sufficient to reject the full proposed managed AWS architecture as a guaranteed zero-cost deployment, but not to certify exact service availability in an account we cannot inspect.

## What you will need to do when the gate is reached

1. Keep the account on the Free plan; do not click Upgrade/activate paid-only features or join AWS Organizations. Check the Free-plan status, remaining credits, expiry date, and the console's service/region eligibility list.
2. Do not create resources under the hard zero-charge requirement. A budget alert is not a spending limit, and a Free plan can still consume all credits and then close the account and its resources.
3. For a later deployment after you change the zero-charge requirement, first choose a region, estimate all line items with AWS Pricing Calculator, and review service eligibility and total cost. Enabling an AWS account is not needed for the current local demo.
4. Only after an explicitly approved paid deployment: set root MFA, never create root access keys, configure least-privilege access, and use workload roles rather than static credentials. Never paste credentials into chat or commit them.
5. AWS CLI SSO, IAM, Secrets Manager, private S3, SQS DLQ/redrive, RDS backups, and CloudWatch are future deployment steps, not current setup requirements. The AWS CLI and Terraform are not installed in this workspace.

## Intended first AWS architecture

- ECS Fargate services for the API and worker, plus a static frontend behind an HTTPS load balancer or CDN.
- RDS PostgreSQL for application data.
- Private S3 bucket for uploaded files, with lifecycle/retention policy and encryption.
- SQS standard queue with a dead-letter queue for resume-analysis jobs. The current SQS adapter should be selected instead of also operating Redis/BullMQ in the first AWS deployment.
- Shared abuse protection: configure AWS WAF rate-based rules in front of the load balancer, or use a shared ElastiCache Redis endpoint via `RATE_LIMIT_REDIS_URL` if application-level counters are required. Keep the in-process memory fallback for single-instance local development only.
- Secrets Manager for production secrets, IAM task roles with least privilege, and CloudWatch logs/alarms.

The repository does not yet include reviewed Terraform/CloudFormation templates, ECS task/service definitions, IAM policies, dashboards/alarms, or an automated backup/restore rehearsal. AWS S3/SQS code has not been exercised against live services. Do not treat this document as a deployable production stack.

## Verification limits

- Docker image/configuration validation passed. RustFS bucket setup and object lifecycle are verified; full application startup, PostgreSQL schema initialization, Redis/BullMQ processing, and browser checks remain pending and can be done locally without AWS resources.
- PostgreSQL lifecycle testing, S3/SQS live calls, ECS deployment, HTTPS/domain setup, and failure recovery require infrastructure access and have not been attempted.
- No AWS resources have been provisioned; no cloud charges have been incurred.
