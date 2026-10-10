import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';
import { useAuth } from './context/AuthContext.js';

// Keep route-specific screens out of the initial JavaScript payload.
const LandingPage = lazy(() => import('./pages/LandingPage.js').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage.js').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage.js').then((module) => ({ default: module.RegisterPage })));
const ProjectDiscoveryPage = lazy(() => import('./pages/ProjectDiscoveryPage.js').then((module) => ({ default: module.ProjectDiscoveryPage })));
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage.js').then((module) => ({ default: module.ProjectDetailsPage })));
const FreelancerDiscoveryPage = lazy(() => import('./pages/FreelancerDiscoveryPage.js').then((module) => ({ default: module.FreelancerDiscoveryPage })));
const FreelancerDashboardPage = lazy(() => import('./pages/FreelancerDashboardPage.js').then((module) => ({ default: module.FreelancerDashboardPage })));
const ClientDashboardPage = lazy(() => import('./pages/ClientDashboardPage.js').then((module) => ({ default: module.ClientDashboardPage })));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage.js').then((module) => ({ default: module.CreateProjectPage })));
const ProjectApplicationsPage = lazy(() => import('./pages/ProjectApplicationsPage.js').then((module) => ({ default: module.ProjectApplicationsPage })));
const ProjectWorkspacePage = lazy(() => import('./pages/ProjectWorkspacePage.js').then((module) => ({ default: module.ProjectWorkspacePage })));
const SkillGapPage = lazy(() => import('./pages/SkillGapPage.js').then((module) => ({ default: module.SkillGapPage })));
const BudgetEstimatorPage = lazy(() => import('./pages/BudgetEstimatorPage.js').then((module) => ({ default: module.BudgetEstimatorPage })));
const QueueDemoPage = lazy(() => import('./pages/QueueDemoPage.js').then((module) => ({ default: module.QueueDemoPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js').then((module) => ({ default: module.ProfilePage })));
const FreelancerProfilePage = lazy(() => import('./pages/FreelancerProfilePage.js').then((module) => ({ default: module.FreelancerProfilePage })));

function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center flex-col gap-4">
      <div className="text-6xl font-extrabold text-slate-200">404</div>
      <div className="text-xl font-bold text-slate-700">Page Not Found</div>
      <a href="/" className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold">
        Go Home
      </a>
    </div>
  );
}

export function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500" role="status">Loading page…</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/projects" element={<ProjectDiscoveryPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/freelancers" element={<FreelancerDiscoveryPage />} />
          <Route path="/freelancers/:id" element={<FreelancerProfilePage />} />
          <Route path="/estimator" element={<BudgetEstimatorPage />} />
          <Route
            path="/queue-demo"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <QueueDemoPage />
              </ProtectedRoute>
            }
          />

          {/* Freelancer Routes */}
          <Route path="/profile/edit" element={<ProtectedRoute allowedRoles={['FREELANCER', 'CLIENT']}><ProfilePage /></ProtectedRoute>} />
          <Route
            path="/freelancer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['FREELANCER']}>
                <FreelancerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skill-gap"
            element={
              <ProtectedRoute allowedRoles={['FREELANCER']}>
                <SkillGapPage />
              </ProtectedRoute>
            }
          />

          {/* Client Routes */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ClientDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/create"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <CreateProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects/:projectId/applications"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ProjectApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Workspace Routes (Client and Freelancer) */}
          <Route
            path="/workspace/projects/:projectId"
            element={
              <ProtectedRoute allowedRoles={['CLIENT', 'FREELANCER']}>
                <ProjectWorkspacePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
