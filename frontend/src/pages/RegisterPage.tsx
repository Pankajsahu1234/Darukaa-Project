import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { Globe, Lock, Mail, User as UserIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.register({
        full_name: fullName,
        email,
        password,
        role: 'admin',
      });
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      const detail =
        err.response?.data?.detail || 'Registration failed. Please check the information provided.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-forest-700 to-emerald-500 text-white shadow-lg shadow-forest-600/20">
            <Globe className="h-7 w-7" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-earth-900 font-sans">
          Create Administrator Account
        </h2>
        <p className="mt-1.5 text-center text-xs text-earth-500">
          Join Darukaa.Earth to manage verified carbon & biodiversity projects
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-earth-200 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Jane Goodall"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                />
              </div>
            </div>

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
                  placeholder="admin@conservation.org"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
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
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Administrator Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-earth-100 pt-4 text-center">
            <p className="text-xs text-earth-500">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-forest-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
