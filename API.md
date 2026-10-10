# REST API Reference

Base path: `/api/v1`. Protected routes accept `Authorization: Bearer <token>`; login and registration also set an HTTP-only cookie. JSON errors use `{ "success": false, "error": "..." }`.

| Group | Routes | Access |
|---|---|---|
| Health | `GET /health` | Public |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Public or signed-in as appropriate |
| Projects | `GET /projects`, `GET /projects/:id`, `GET /projects/my-projects`, `POST /projects`, `PUT /projects/:id` | Discovery public; owner/client for writes; optional auth for private contract view |
| Profiles | `GET /profiles/freelancers`, `GET /profiles/freelancers/:id`, `GET /profiles/clients/:id`; profile update/skill routes | Public reads; role owner for writes |
| Applications | `POST /applications`, `GET /applications/my-applications`, `POST /applications/:id/withdraw`, `GET /applications/project/:projectId` | Freelancer or owning client |
| Hiring | `POST /hiring/hire`, `POST /hiring/complete/:contractId`, `GET /hiring` | Owning client or contract participant |
| Tasks | `GET /tasks/project/:projectId`, `POST /tasks`, `PATCH /tasks/:taskId/status`, `DELETE /tasks/:taskId` | Authenticated project members; owner/admin for deletion |
| Reviews | `POST /reviews`, `GET /reviews/user/:userId` | Participant review writes; public review reads |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | Signed-in user; records scoped to self |
| Files | `POST /files/resume`, `POST /files/projects/:projectId`, `DELETE /files/projects/:projectId/:fileId`, `GET /files/resume/status`, `GET /files/:fileKey` | Freelancer resume upload/status; project participants upload/download; uploader, project owner, or admin can delete project files |
| Intelligent | `GET /intelligent/match/project/:projectId`, `GET /intelligent/match/freelancer`, `POST /intelligent/skill-gap`, `POST /intelligent/estimate` | Project owner/admin for candidates; freelancer for recommendations/gaps; estimator public |
| Admin | `GET /admin/stats`, `GET /admin/queue`, `POST /admin/queue/burst`, `POST /admin/queue/retry/:jobId` | ADMIN only |

Request bodies, public discovery query filters, and supported UUID route parameters are validated with Zod before controller work. Authentication, upload, and computational matching endpoints use IP-based limits in each API process. Limits are not shared between replicas. The API honors forwarded IP headers only when `TRUST_PROXY_HOPS` is explicitly configured for a trusted proxy topology.
