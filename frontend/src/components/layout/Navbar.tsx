import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Globe, Layers, BarChart3, LogOut, User, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: BarChart3 },
    { label: 'Projects & Sites', path: '/projects', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-earth-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-forest-700 to-emerald-500 text-white shadow-md shadow-forest-600/20 group-hover:scale-105 transition-transform">
              <Globe className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-earth-900 font-sans">
                  Darukaa<span className="text-emerald-600">.Earth</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  Geospatial
                </span>
              </div>
              <p className="text-[10px] text-earth-500 tracking-wide font-medium -mt-0.5">
                Carbon & Biodiversity Intelligence
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  location.pathname === link.path ||
                  (link.path !== '/' && location.pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-forest-50 text-forest-800 border border-forest-200/60 shadow-xs'
                        : 'text-earth-600 hover:text-earth-900 hover:bg-earth-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-forest-600' : 'text-earth-400'}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Action / Auth Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-1 rounded-full bg-earth-50 border border-earth-200">
                <div className="h-6 w-6 rounded-full bg-forest-600 text-white flex items-center justify-center text-xs font-semibold uppercase">
                  {user?.full_name ? user.full_name.charAt(0) : <User className="h-3 w-3" />}
                </div>
                <div className="text-left leading-tight pr-1">
                  <p className="text-xs font-semibold text-earth-800 truncate max-w-[140px]">
                    {user?.full_name}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      user?.role === 'evaluator'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : user?.role === 'admin'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user?.role === 'evaluator' ? 'Auditor / Evaluator' : user?.role || 'User'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-earth-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                title="Sign out of platform"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-earth-700 hover:text-earth-900 hover:bg-earth-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-forest-600 text-white hover:bg-forest-700 shadow-sm transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
