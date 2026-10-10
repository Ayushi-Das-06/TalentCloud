export type UserRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  profile?: any;
}

export interface Skill {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
}

export interface FreelancerSkill {
  id: string;
  skillId: string;
  skill: Skill;
  yearsExperience: number;
  isVerified: boolean;
}

export interface FreelancerProfile {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  headline?: string | null;
  bio?: string | null;
  experienceYears: number;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  hourlyRate?: number | null;
  availability: 'FULL_TIME' | 'PART_TIME' | 'NOT_AVAILABLE';
  portfolioLinks?: { title: string; url: string }[];
  averageRating: number;
  completedProjectsCount: number;
  profileCompletion: number;
  skills: FreelancerSkill[];
}

export interface ClientProfile {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  companyName?: string | null;
  industry?: string | null;
  description?: string | null;
  website?: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  client: {
    id: string;
    companyName?: string | null;
    user: {
      id: string;
      name: string;
      avatarUrl?: string | null;
    };
  };
  title: string;
  description: string;
  category: string;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  minBudget: number;
  maxBudget: number;
  currency: string;
  estimatedDurationDays: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedDeliverables?: string | null;
  deadline?: string | null;
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  skills: { id: string; skill: Skill }[];
  _count?: {
    applications: number;
    tasks?: number;
  };
}

export interface Application {
  id: string;
  projectId: string;
  project?: Project;
  freelancerProfileId: string;
  freelancerProfile?: FreelancerProfile;
  coverLetter: string;
  proposedBudget: number;
  estimatedDays: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
}

export interface Contract {
  id: string;
  projectId: string;
  project: Project;
  applicationId: string;
  clientId: string;
  client: ClientProfile;
  freelancerProfileId: string;
  freelancer: FreelancerProfile;
  agreedBudget: number;
  currency: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  startedAt: string;
  completedAt?: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assignedToProfile?: {
    id: string;
    user: { name: string; avatarUrl?: string | null };
  } | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  dueDate?: string | null;
  createdAt: string;
  files?: ProjectFile[];
}

export interface ProjectFile {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface MatchCandidate {
  candidateId: string;
  candidateName: string;
  overallScore: number;
  matchTier: 'Excellent Match' | 'Good Match' | 'Partial Match';
  componentScores: {
    skillMatch: number;
    experienceMatch: number;
    pastPerformance: number;
    ratingMatch: number;
    availabilityMatch: number;
    budgetCompatibility: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  explanations: string[];
  freelancer?: FreelancerProfile;
  project?: Project;
}
