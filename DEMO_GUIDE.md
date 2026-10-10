# TalentCloud Demo Guide

## Seeded accounts

`npm run seed` clears the configured database, then creates these local demo accounts:

| Role | Email | Password |
|---|---|---|
| Client | `sarah.client@demo.com` | `Password123!` |
| Freelancer | `alex.dev@demo.com` | `Password123!` |
| Freelancer | `elena.ai@demo.com` | `Password123!` |
| Admin | `admin@marketplace.demo` | `AdminSecurePassword123!` |

These are demonstration credentials, not production credentials.

## Suggested walkthrough

1. Open the public project discovery page and inspect project requirements and the budget range.
2. Sign in as a freelancer, review skill-gap and project recommendations, then submit a proposal.
3. Sign in as the client, review applications, select a proposal, and open the delivery workspace.
4. Demonstrate task status flow, project completion, and participant review.
5. Upload a PDF, DOCX, TXT, or Markdown resume as the freelancer and view the queued/processed analysis.
6. Sign in as admin and show system and queue metrics.

The demonstration depends on a seeded disposable database. Docker and AWS are not required for the in-memory local path.
