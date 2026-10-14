import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Award, 
  CheckCircle, 
  Shield, 
  Cpu, 
  WifiOff, 
  Users, 
  ArrowRight, 
  BookOpen, 
  FileCheck 
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, user, login } = useAuth();
  const { t } = useLanguage();

  const handleQuickLogin = (role: 'worker' | 'assessor' | 'admin') => {
    // Quick demo login buttons for frictionless evaluation
    const accounts = {
      worker: { email: 'worker@rpl.gov.in', pass: 'Password123!' },
      assessor: { email: 'assessor@rpl.gov.in', pass: 'Password123!' },
      admin: { email: 'admin@rpl.gov.in', pass: 'Password123!' },
    };
    const target = accounts[role];
    fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target.email, password: target.pass })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token && data.user) {
        login(data.token, data.user);
        if (role === 'worker') onNavigate('worker-dashboard');
        else if (role === 'assessor') onNavigate('assessor-dashboard');
        else onNavigate('admin-dashboard');
      }
    })
    .catch(err => console.error(err));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider mb-6">
            <Award className="w-4 h-4 text-amber-300" />
            <span>{t('landing.badge')}</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            {t('landing.heroTitle')} <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-200 to-teal-300">
              {t('landing.heroHighlight')}
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          {/* Quick Action / Login */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition flex items-center space-x-2"
                >
                  <span>{t('landing.registerWorker')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition"
                >
                  {t('landing.signInAccount')}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (user?.role === 'worker') onNavigate('worker-dashboard');
                  else if (user?.role === 'assessor') onNavigate('assessor-dashboard');
                  else onNavigate('admin-dashboard');
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg transition flex items-center space-x-2"
              >
                <span>Go to Your {user?.role.toUpperCase()} Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 1-Click Evaluation Demo Logins */}
          <div className="mt-10 pt-6 border-t border-slate-800 max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-3">
              {t('landing.quickPersonas')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => handleQuickLogin('worker')}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition flex items-center justify-center space-x-1"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('landing.workerRajesh')}</span>
              </button>
              <button
                onClick={() => handleQuickLogin('assessor')}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition flex items-center justify-center space-x-1"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('landing.assessorAnanya')}</span>
              </button>
              <button
                onClick={() => handleQuickLogin('admin')}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition flex items-center justify-center space-x-1"
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('landing.administrator')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('landing.pillarsTitle')}
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
            {t('landing.pillarsDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4 font-bold text-xl">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Structured Self-Declaration & Mapping</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Workers input their daily trade tasks, tools used, and informal experience. The AI mapping engine searches 
              the official National Qualification Register (1,912 qualifications) and cites matching Performance Criteria with clear rationale.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 font-bold text-xl">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Guided Standardized Scoring Rubric</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Assessors evaluate practical competence using 4-tier standardized rubrics (Exceeds, Competent, Developing, Not Demonstrated) 
              reducing evaluator variance. Automatically checks Theory (40%) and Practical (60%) passing thresholds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4 font-bold text-xl">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Human-in-the-Loop Governance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              AI acts exclusively as an evaluation co-pilot—flagging missing evidence and calculating objective scores. 
              The binding certification decision is signed off exclusively by an authorized human assessor with cryptographic audit logging.
            </p>
          </div>
        </div>

        {/* Highlighted Feature Badges */}
        <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-800/40">
              <BookOpen className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">1,912</div>
              <div className="text-xs text-slate-400">Official NQR Qualifications</div>
            </div>
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-800/40">
              <Cpu className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">84+</div>
              <div className="text-xs text-slate-400">Full-Stack Developer Criteria</div>
            </div>
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-800/40">
              <WifiOff className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">Offline-Ready</div>
              <div className="text-xs text-slate-400">IndexedDB & Background Sync</div>
            </div>
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-800/40">
              <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">100% Audited</div>
              <div className="text-xs text-slate-400">Tamper-Evident Signatures</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
