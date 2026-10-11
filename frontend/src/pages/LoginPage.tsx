import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogIn, User, Shield, FileCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.auth.login({ email, password });
      login(res.token, res.user);
      if (res.user.role === 'worker') onNavigate('worker-dashboard');
      else if (res.user.role === 'assessor') onNavigate('assessor-dashboard');
      else onNavigate('admin-dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (role: 'worker' | 'assessor' | 'admin') => {
    if (role === 'worker') {
      setEmail('worker@rpl.gov.in');
      setPassword('Password123!');
    } else if (role === 'assessor') {
      setEmail('assessor@rpl.gov.in');
      setPassword('Password123!');
    } else {
      setEmail('admin@rpl.gov.in');
      setPassword('Password123!');
    }
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sign in to RPL SkillAssess</h2>
          <p className="mt-1 text-sm text-slate-500">Access your skill profile, checklists, or assessment queue</p>
        </div>

        {/* Demo Fast-Fill Buttons */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Quick Demo Accounts:</div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoAccount('worker')}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition"
            >
              Worker
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('assessor')}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition"
            >
              Assessor
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('admin')}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition"
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. worker@rpl.gov.in"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
};
