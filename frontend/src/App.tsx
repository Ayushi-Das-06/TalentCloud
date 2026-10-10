import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';
import { useAuth } from './context/AuthContext.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ProjectDiscoveryPage } from './pages/ProjectDiscoveryPage.js';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage.js';
import { FreelancerDiscoveryPage } from './pages/FreelancerDiscoveryPage.js';
import { FreelancerDashboardPage } from './pages/FreelancerDashboardPage.js';
import { ClientDashboardPage } from './pages/ClientDashboardPage.js';
import { CreateProjectPage } from './pages/CreateProjectPage.js';
import { ProjectApplicationsPage } from './pages/ProjectApplicationsPage.js';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage.js';
import { SkillGapPage } from './pages/SkillGapPage.js';
import { BudgetEstimatorPage } from './pages/BudgetEstimatorPage.js';
import { QueueDemoPage } from './pages/QueueDemoPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { FreelancerProfilePage } from './pages/FreelancerProfilePage.js';

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
      </main>
      <Footer />
    </div>
  );
}
