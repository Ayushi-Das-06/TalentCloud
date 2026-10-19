# TalentCloud Demo Guide

## Seeded accounts

`npm run seed` clears the configured database, then creates these local demo accounts. Before running it, confirm `DATABASE_URL` points to a disposable development database: the command deletes/replaces its records. Never seed a database containing work you need to keep.

| Role | Email | Password |
|---|---|---|
| Client | `sarah.client@demo.com` | `Password123!` |
| Freelancer | `alex.dev@demo.com` | `Password123!` |
| Freelancer | `elena.ai@demo.com` | `Password123!` |
| Admin | `admin@marketplace.demo` | `AdminSecurePassword123!` |

These are demonstration credentials, not production credentials.

## Suggested walkthrough

Use separate synthetic client and freelancer accounts (or seed the disposable database and use the credentials above). The local routes are included so each screen is easy to find.

1. **Client registration and project:** open `/register`, create a client account, then visit `/projects/create`. Enter a title, description, skills, budget, and deadline. Choose **Save Draft**, confirm it appears on `/client/dashboard`, then use **Publish**; alternatively choose **Publish Project** on the create form.
2. **Freelancer registration and discovery:** sign out, register a freelancer, and visit `/projects`. Open the published project and submit a proposal with a cover letter, budget, and estimated days.
3. **Client review and hire:** sign back in as the client. On `/client/dashboard`, choose **Review Proposals** for the project and **Accept Proposal & Hire** for the freelancer.
4. **Workspace and attachments:** open the project workspace from the dashboard (route `/workspace/projects/<projectId>`). Create a task, change its status through the task controls, and attach a small synthetic file. Verify an unrelated account cannot access the private attachment.
5. **Completion and reviews:** as the client, use **Mark Project Completed** after finishing the task flow. Both contract participants can then leave a **Leave Verified Review**; demonstrate the reciprocal review and the duplicate/outsider rejection if time allows.
6. **Matching and skill gaps:** as the freelancer, open `/freelancer/dashboard` for project recommendations and `/skill-gap` for project skill gaps.
7. **Resume analysis:** in `/freelancer/dashboard`, upload a synthetic PDF, DOCX, TXT, or Markdown resume. With the local in-memory queue, the API process runs the worker; refresh the resume section to show extracted suggestions, then explicitly confirm skills.
8. **Budget and timeline estimate:** open `/estimator`, enter project details, and show the suggested budget range and duration. The create-project form also shows estimator guidance.
9. **Admin:** sign in with the seeded admin account and open `/queue-demo` to show queue/system metrics and failed-job controls.

## Evidence checklist

Capture screenshots yourself during the demo; no screenshots are supplied or claimed by this repository. Save any captured images locally in an untracked `demo-evidence/` folder (review and redact emails, tokens, and personal data before sharing). Useful captures: published project in public discovery; client proposal list before/after hire; workspace task and attachment; resume analysis with confirmed skills; estimator output; and admin queue view. Record the commands and browser date if the evidence will be submitted for assessment.

The demonstration depends on a seeded disposable database. Docker and AWS are not required for the in-memory local path. For zero AWS spend, run the app locally with SQLite, local file storage, and the in-memory queue; this is a laptop demo and is not publicly reachable or highly available. See [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) for the current cloud readiness gate and account-plan limits.
