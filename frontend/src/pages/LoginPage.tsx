import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { Globe, Lock, Mail, ArrowRight, Loader2, AlertCircle, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login({ email, password });
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const detail =
        err.response?.data?.detail || 'Invalid email or password. Please verify credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-forest-700 to-emerald-500 text-white shadow-lg shadow-forest-600/20">
            <Globe className="h-7 w-7" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-earth-900 font-sans">
          Sign in to <span className="text-emerald-600">Darukaa.Earth</span>
        </h2>
        <p className="mt-1.5 text-center text-xs text-earth-500">
          Geospatial Carbon & Biodiversity Analytics Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-earth-200 rounded-2xl">
          {/* Quick-fill button for Evaluators */}
          <div className="mb-6 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-2">
              <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
              <span>Evaluation Quick-Access</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@darukaa.earth', 'Password123!')}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                Auto-fill Admin (Full Access)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('evaluator@darukaa.earth', 'Password123!')}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                Auto-fill Evaluator
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@darukaa.earth"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-forest-600 hover:bg-forest-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-earth-100 pt-4 text-center">
            <p className="text-xs text-earth-500">
              Don't have an administrator account?{' '}
              <Link to="/register" className="font-semibold text-forest-600 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
