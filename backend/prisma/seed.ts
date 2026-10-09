import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding database with realistic demonstration dataset...');

  // Clean existing records in correct foreign key order
  await prisma.review.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.task.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.application.deleteMany();
  await prisma.projectAttachment.deleteMany();
  await prisma.projectSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.resumeAnalysis.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.freelancerSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.backgroundJob.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('Password123!', 10);
  const adminPassword = await bcrypt.hash('AdminSecurePassword123!', 10);

  // 1. Create Admin User
  await prisma.user.create({
    data: {
      email: 'admin@marketplace.demo',
      name: 'Platform Administrator',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  // 2. Create Skills
  const skillData = [
    { name: 'TypeScript', normalizedName: 'TypeScript', category: 'Programming' },
    { name: 'JavaScript', normalizedName: 'JavaScript', category: 'Programming' },
    { name: 'React', normalizedName: 'React', category: 'Frontend' },
    { name: 'Node.js', normalizedName: 'Node.js', category: 'Backend' },
    { name: 'Python', normalizedName: 'Python', category: 'Programming' },
    { name: 'PostgreSQL', normalizedName: 'PostgreSQL', category: 'Database' },
    { name: 'Docker', normalizedName: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', normalizedName: 'Kubernetes', category: 'DevOps' },
    { name: 'AWS', normalizedName: 'AWS', category: 'Cloud' },
    { name: 'Tailwind CSS', normalizedName: 'Tailwind CSS', category: 'Frontend' },
    { name: 'GraphQL', normalizedName: 'GraphQL', category: 'API' },
    { name: 'FastAPI', normalizedName: 'FastAPI', category: 'Backend' },
  ];

  const skills: Record<string, any> = {};
  for (const s of skillData) {
    skills[s.name] = await prisma.skill.create({ data: s });
  }

  // 3. Create Freelancer Users & Profiles
  // Freelancer 1: Alex Rivera (Full-Stack TypeScript & React)
  const alexUser = await prisma.user.create({
    data: {
      email: 'alex.dev@demo.com',
      name: 'Alex Rivera',
      passwordHash: defaultPassword,
      role: 'FREELANCER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      freelancerProfile: {
        create: {
          headline: 'Senior Full-Stack TypeScript & Cloud Architect',
          bio: '8+ years building enterprise SaaS platforms, reactive UIs in React, and scalable Node.js microservices.',
          experienceYears: 8,
          experienceLevel: 'EXPERT',
          hourlyRate: 75.0,
          availability: 'FULL_TIME',
          averageRating: 4.95,
          completedProjectsCount: 14,
          profileCompletion: 95,
          portfolioLinks: JSON.stringify([
            { title: 'Cloud Metrics Dashboard', url: 'https://github.com/demo/cloud-metrics' },
            { title: 'E-Commerce Microservices', url: 'https://github.com/demo/ecommerce-api' },
          ]),
        },
      },
    },
    include: { freelancerProfile: true },
  });

  // Freelancer 2: Elena Rostova (Python & AI Specialist)
  const elenaUser = await prisma.user.create({
    data: {
      email: 'elena.ai@demo.com',
      name: 'Elena Rostova',
      passwordHash: defaultPassword,
      role: 'FREELANCER',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      freelancerProfile: {
        create: {
          headline: 'Machine Learning & Python Backend Engineer',
          bio: 'Specialized in intelligent algorithms, FastAPI data pipelines, and natural language processing pipelines.',
          experienceYears: 5,
          experienceLevel: 'INTERMEDIATE',
          hourlyRate: 65.0,
          availability: 'FULL_TIME',
          averageRating: 4.88,
          completedProjectsCount: 9,
          profileCompletion: 90,
        },
      },
    },
    include: { freelancerProfile: true },
  });

  // Freelancer 3: Marcus Vance (DevOps & Cloud Infrastructure)
  const marcusUser = await prisma.user.create({
    data: {
      email: 'marcus.devops@demo.com',
      name: 'Marcus Vance',
      passwordHash: defaultPassword,
      role: 'FREELANCER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      freelancerProfile: {
        create: {
          headline: 'Cloud Infrastructure & Kubernetes Specialist',
          bio: 'AWS Certified Solutions Architect. Terraform, Docker, ECS, and CI/CD automation expert.',
          experienceYears: 6,
          experienceLevel: 'EXPERT',
          hourlyRate: 85.0,
          availability: 'PART_TIME',
          averageRating: 4.90,
          completedProjectsCount: 11,
          profileCompletion: 85,
        },
      },
    },
    include: { freelancerProfile: true },
  });

  // Assign Skills to Freelancers
  const alexSkills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'];
  for (const s of alexSkills) {
    await prisma.freelancerSkill.create({
      data: {
        freelancerProfileId: alexUser.freelancerProfile!.id,
        skillId: skills[s].id,
        yearsExperience: 6,
        isVerified: true,
      },
    });
  }

  const elenaSkills = ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'];
  for (const s of elenaSkills) {
    await prisma.freelancerSkill.create({
      data: {
        freelancerProfileId: elenaUser.freelancerProfile!.id,
        skillId: skills[s].id,
        yearsExperience: 4,
        isVerified: true,
      },
    });
  }

  const marcusSkills = ['Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'Node.js'];
  for (const s of marcusSkills) {
    await prisma.freelancerSkill.create({
      data: {
        freelancerProfileId: marcusUser.freelancerProfile!.id,
        skillId: skills[s].id,
        yearsExperience: 5,
        isVerified: true,
      },
    });
  }

  // 4. Create Clients
  const sarahUser = await prisma.user.create({
    data: {
      email: 'sarah.client@demo.com',
      name: 'Sarah Jenkins',
      passwordHash: defaultPassword,
      role: 'CLIENT',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      clientProfile: {
        create: {
          companyName: 'CloudTech Solutions Inc.',
          industry: 'Cloud Computing & Enterprise SaaS',
          description: 'Leading provider of distributed systems and scalable multi-tenant cloud software.',
          website: 'https://cloudtech-demo.com',
        },
      },
    },
    include: { clientProfile: true },
  });

  const davidUser = await prisma.user.create({
    data: {
      email: 'david.fintech@demo.com',
      name: 'David Sterling',
      passwordHash: defaultPassword,
      role: 'CLIENT',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      clientProfile: {
        create: {
          companyName: 'FinSecure Global',
          industry: 'Financial Technology',
          description: 'High-security micro-banking and compliance automation platform.',
          website: 'https://finsecure-demo.com',
        },
      },
    },
    include: { clientProfile: true },
  });

  // 5. Create Projects
  // Project 1: Open project seeking Full-Stack TypeScript engineer
  const project1 = await prisma.project.create({
    data: {
      clientId: sarahUser.clientProfile!.id,
      title: 'Scalable Cloud Observability & Metrics Dashboard',
      description: 'Develop a modern interactive telemetry dashboard using React, Tailwind CSS, TypeScript, and Node.js with real-time charting and PostgreSQL timeseries aggregation.',
      category: 'Web Development',
      experienceLevel: 'EXPERT',
      minBudget: 3500.0,
      maxBudget: 5000.0,
      currency: 'USD',
      estimatedDurationDays: 30,
      complexity: 'HIGH',
      expectedDeliverables: 'Production Vite frontend, REST API endpoints, Docker containerization, unit test suite.',
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      skills: {
        create: [
          { skillId: skills['TypeScript'].id },
          { skillId: skills['React'].id },
          { skillId: skills['Node.js'].id },
          { skillId: skills['PostgreSQL'].id },
        ],
      },
    },
  });

  // Project 2: In-Progress Project assigned to Alex Rivera
  const project2 = await prisma.project.create({
    data: {
      clientId: davidUser.clientProfile!.id,
      title: 'Secure Banking API Gateway & Microservice Auth Engine',
      description: 'Refactor our authentication gateway using Argon2id, JWT validation, and rate limiting in Node.js and PostgreSQL.',
      category: 'Cloud / DevOps',
      experienceLevel: 'INTERMEDIATE',
      minBudget: 2200.0,
      maxBudget: 3000.0,
      currency: 'USD',
      estimatedDurationDays: 21,
      complexity: 'MEDIUM',
      status: 'IN_PROGRESS',
      skills: {
        create: [
          { skillId: skills['Node.js'].id },
          { skillId: skills['TypeScript'].id },
          { skillId: skills['Docker'].id },
        ],
      },
    },
  });

  // Application & Active Contract for Project 2
  const appP2 = await prisma.application.create({
    data: {
      projectId: project2.id,
      freelancerProfileId: alexUser.freelancerProfile!.id,
      coverLetter: 'I have extensive experience with Node.js security patterns, Argon2, and zero-trust API gateways.',
      proposedBudget: 2600.0,
      estimatedDays: 18,
      status: 'ACCEPTED',
    },
  });

  const contractP2 = await prisma.contract.create({
    data: {
      projectId: project2.id,
      applicationId: appP2.id,
      clientId: davidUser.clientProfile!.id,
      freelancerProfileId: alexUser.freelancerProfile!.id,
      agreedBudget: 2600.0,
      currency: 'USD',
      status: 'ACTIVE',
    },
  });

  // Tasks for Project 2
  await prisma.task.createMany({
    data: [
      {
        projectId: project2.id,
        contractId: contractP2.id,
        title: 'Audit Current Authentication Vulnerabilities',
        description: 'Review existing auth flows, token renewal, and rate limiters.',
        assignedToProfileId: alexUser.freelancerProfile!.id,
        createdByUserId: davidUser.id,
        priority: 'HIGH',
        status: 'COMPLETED',
      },
      {
        projectId: project2.id,
        contractId: contractP2.id,
        title: 'Implement Argon2id & Centralized JWT Engine',
        description: 'Replace legacy MD5 hashes and add token revocation lists.',
        assignedToProfileId: alexUser.freelancerProfile!.id,
        createdByUserId: davidUser.id,
        priority: 'URGENT',
        status: 'IN_PROGRESS',
      },
      {
        projectId: project2.id,
        contractId: contractP2.id,
        title: 'Dockerize and Run Load Testing in Staging',
        description: 'Verify 200 req/sec under burst conditions without auth degradation.',
        assignedToProfileId: alexUser.freelancerProfile!.id,
        createdByUserId: davidUser.id,
        priority: 'MEDIUM',
        status: 'TODO',
      },
    ],
  });

  // Project 3: Completed Project with Verified Review
  const project3 = await prisma.project.create({
    data: {
      clientId: sarahUser.clientProfile!.id,
      title: 'Automated CI/CD Pipeline & ECS Deployments',
      description: 'Configure automated GitHub Actions workflows to deploy Docker containers to Amazon ECS Fargate with zero downtime.',
      category: 'Cloud / DevOps',
      experienceLevel: 'EXPERT',
      minBudget: 1800.0,
      maxBudget: 2500.0,
      currency: 'USD',
      estimatedDurationDays: 14,
      complexity: 'HIGH',
      status: 'COMPLETED',
      skills: {
        create: [
          { skillId: skills['Docker'].id },
          { skillId: skills['Kubernetes'].id },
          { skillId: skills['AWS'].id },
        ],
      },
    },
  });

  const appP3 = await prisma.application.create({
    data: {
      projectId: project3.id,
      freelancerProfileId: marcusUser.freelancerProfile!.id,
      coverLetter: 'AWS DevOps specialist ready to set up production ECS Fargate pipelines.',
      proposedBudget: 2100.0,
      estimatedDays: 12,
      status: 'ACCEPTED',
    },
  });

  await prisma.contract.create({
    data: {
      projectId: project3.id,
      applicationId: appP3.id,
      clientId: sarahUser.clientProfile!.id,
      freelancerProfileId: marcusUser.freelancerProfile!.id,
      agreedBudget: 2100.0,
      currency: 'USD',
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Verified Review for Marcus
  await prisma.review.create({
    data: {
      projectId: project3.id,
      reviewerId: sarahUser.id,
      revieweeId: marcusUser.id,
      rating: 5,
      feedback: 'Outstanding delivery! Marcus set up our ECS deployment pipelines cleanly and provided exceptional documentation.',
    },
  });

  // 6. Add initial notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alexUser.id,
        title: 'Active Project Milestone In Progress',
        message: 'Task "Implement Argon2id & Centralized JWT Engine" is due this Friday.',
        type: 'TASK_UPDATED',
        link: `/workspace/projects/${project2.id}`,
      },
      {
        userId: sarahUser.id,
        title: 'Project Published Successfully',
        message: 'Your project "Scalable Cloud Observability & Metrics Dashboard" is live and accepting proposals.',
        type: 'SYSTEM',
        link: `/projects/${project1.id}`,
      },
    ],
  });

  console.log('[Seed] Database successfully populated with realistic demonstration data!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
