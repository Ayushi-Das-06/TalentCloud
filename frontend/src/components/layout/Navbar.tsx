import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Cloud,
  Briefcase,
  Users,
  Bell,
  Cpu,
  Layers,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                TalentCloud
              </span>
              <span className="hidden sm:inline-block ml-1 text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium border border-brand-200">
                AI Match
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/projects" className="hover:text-brand-600 flex items-center gap-1.5 transition-colors">
              <Briefcase className="w-4 h-4" />
              Find Projects
            </Link>
            <Link to="/freelancers" className="hover:text-brand-600 flex items-center gap-1.5 transition-colors">
              <Users className="w-4 h-4" />
              Find Talent
            </Link>
            <Link to="/estimator" className="hover:text-brand-600 flex items-center gap-1.5 transition-colors">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Smart Estimator
            </Link>
            <Link to="/queue-demo" className="hover:text-brand-600 flex items-center gap-1.5 transition-colors">
              <Cpu className="w-4 h-4 text-indigo-500" />
              Queue & Cloud Lab
            </Link>

            {user?.role === 'FREELANCER' && (
              <Link to="/skill-gap" className="hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                <Layers className="w-4 h-4 text-amber-500" />
                Skill Gap
              </Link>
            )}
          </nav>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'CLIENT' && (
                  <Link
                    to="/projects/create"
                    className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Post Project
                  </Link>
                )}

                <Link
                  to={user.role === 'CLIENT' ? '/client/dashboard' : '/freelancer/dashboard'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>{user.name.split(' ')[0]}</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase font-semibold">
                    {user.role}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-brand-600 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-sm shadow-brand-500/20 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/projects"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 font-medium py-2"
          >
            Find Projects
          </Link>
          <Link
            to="/freelancers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 font-medium py-2"
          >
            Find Talent
          </Link>
          <Link
            to="/estimator"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 font-medium py-2"
          >
            Smart Estimator
          </Link>
          <Link
            to="/queue-demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 font-medium py-2"
          >
            Queue & Cloud Lab
          </Link>
          {user ? (
            <div className="pt-3 border-t border-slate-200">
              <Link
                to={user.role === 'CLIENT' ? '/client/dashboard' : '/freelancer/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-brand-600 font-semibold py-2"
              >
                Go to Dashboard ({user.role})
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="block text-red-600 font-medium py-2"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-200 flex gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-1/2 text-center py-2 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-1/2 text-center py-2 bg-brand-600 rounded-lg font-medium text-white"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
