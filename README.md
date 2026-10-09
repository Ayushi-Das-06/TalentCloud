# Cloud-Based Intelligent Freelancing and Project Marketplace

An enterprise-grade, academic demonstration platform designed for university Cloud Architecture Design course presentations, vivas, and real-world evaluation.

---

## 🌟 Key Features

1. **Intelligent Freelancer–Project Matching**: Explainable weighted matching engine (Skills 40%, Experience 20%, Past Performance 15%, Rating 10%, Availability 10%, Budget 5%) with transparent score breakdowns.
2. **Asynchronous Resume & Skill Analyzer**: Non-blocking document ingestion pipeline that extracts raw text and matches skills against a canonical dictionary via decoupled background workers.
3. **Skill-Gap Analysis**: Real-time gap analysis comparing freelancer competencies against project requirements and industry market demands.
4. **Smart Budget & Deadline Estimator**: Heuristic estimator generating transparent ranges, effort factors, and confidence metrics for client project scoping.
5. **Cloud-Native Decoupled Architecture**: Independent worker scaling, asynchronous queue buffering (BullMQ / AWS SQS adapter), pluggable object storage (S3 / MinIO / Local), and centralized observability.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts, Lucide Icons, React Router 6
- **Backend**: Node.js, Express, TypeScript, Zod, Argon2/bcrypt, JWT, Multer
- **Database**: PostgreSQL with Prisma ORM
- **Background Processing**: Redis + BullMQ (or built-in async queue adapter) & AWS SQS ready
- **Storage**: S3-compatible adapter (Local disk, MinIO, or AWS S3)
- **Cloud Architecture**: Designed for AWS ECS Fargate, SQS, S3, RDS PostgreSQL, ElastiCache, and CloudWatch

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- PostgreSQL (or local SQLite/container)

### 2. Setup Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Update .env with your database connection string
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Setup Background Worker (Optional standalone worker)
```bash
cd backend
npm run worker
```

---

## 👥 Demo Accounts (Seeded)

| Role | Email | Password | Details |
|---|---|---|---|
| **Client** | `sarah.client@demo.com` | `Password123!` | TechCorp hiring manager with active projects |
| **Freelancer** | `alex.dev@demo.com` | `Password123!` | Full-stack TypeScript & React engineer |
| **Freelancer** | `elena.ai@demo.com` | `Password123!` | Cloud & Python AI Specialist |
| **Admin** | `admin@marketplace.demo` | `AdminSecurePassword123!` | Platform Administrator with queue monitor |

---

## 📖 Architecture & Documentation

- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md): Full implementation roadmap and completion checklist.
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md): Step-by-step progress, fixes, and milestones.
- [`DECISIONS.md`](./DECISIONS.md): Architectural Decision Records (ADRs).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): System diagrams, asynchronous workflows, and cloud topologies.
- [`API.md`](./API.md): Complete REST API documentation.
- [`TESTING.md`](./TESTING.md): Test suites, unit test verification, and E2E scenarios.
- [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md): AWS Cloud production deployment instructions.
- [`DEMO_GUIDE.md`](./DEMO_GUIDE.md): Viva / academic presentation walkthrough.
