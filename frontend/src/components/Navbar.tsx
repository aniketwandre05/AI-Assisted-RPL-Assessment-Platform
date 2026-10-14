import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { 
  Award, 
  User as UserIcon, 
  LogOut, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  FileText, 
  CheckSquare, 
  Layers, 
  ShieldCheck,
  Globe 
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAuthenticated, logout, isOnline, pendingSyncCount, syncOfflineQueue } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOfflineQueue();
    setIsSyncing(false);
  };

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      {/* Official Gov/MSDE Top Banner */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs flex justify-between items-center text-slate-300 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-amber-400">Skill India Digital / NCVET</span>
          <span>•</span>
          <span>Recognition of Prior Learning (RPL) Platform</span>
        </div>
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-200 shadow-inner">
            <Globe className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <select
              aria-label="Select platform language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="en" className="bg-slate-900 text-slate-200">English (EN)</option>
              <option value="hi" className="bg-slate-900 text-slate-200">हिंदी (HI)</option>
              <option value="mr" className="bg-slate-900 text-slate-200">मराठी (MR)</option>
            </select>
          </div>

          {/* Connectivity Status */}
          <div className="flex items-center space-x-1.5">
            {isOnline ? (
              <span className="flex items-center text-emerald-400">
                <Wifi className="w-3.5 h-3.5 mr-1" /> {t('nav.online')}
              </span>
            ) : (
              <span className="flex items-center text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5 mr-1" /> {t('nav.offline')}
              </span>
            )}
          </div>

          {/* Sync Queue */}
          {pendingSyncCount > 0 && (
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className="flex items-center px-2 py-0.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-xs transition"
              title="Click to synchronize offline changes"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {pendingSyncCount} Pending Sync
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner group-hover:bg-indigo-500 transition">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block">{t('nav.brand')}</span>
              <span className="text-xs text-slate-400 block -mt-1">{t('nav.subbrand')}</span>
            </div>
          </div>

          {/* Navigation Items based on Role */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                currentView === 'landing' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {t('nav.home')}
            </button>

            {isAuthenticated && user?.role === 'worker' && (
              <>
                <button
                  onClick={() => onNavigate('worker-dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    currentView === 'worker-dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {t('nav.myDashboard')}
                </button>
                <button
                  onClick={() => onNavigate('worker-profile')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    currentView === 'worker-profile' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" /> {t('nav.skillDeclaration')}
                </button>
                <button
                  onClick={() => onNavigate('worker-matches')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    currentView === 'worker-matches' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 inline mr-1" /> {t('nav.qualMatches')}
                </button>
              </>
            )}

            {isAuthenticated && (user?.role === 'assessor' || user?.role === 'admin') && (
              <button
                onClick={() => onNavigate('assessor-dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  currentView === 'assessor-dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4 inline mr-1" /> {t('nav.assessorPortal')}
              </button>
            )}

            {isAuthenticated && user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin-dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  currentView === 'admin-dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 inline mr-1" /> {t('nav.adminAudits')}
              </button>
            )}
          </nav>

          {/* User Status / Login / Logout */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-200">{user.full_name}</div>
                  <span className={`inline-block px-2 py-0.2 text-[10px] uppercase font-bold rounded tracking-wider ${
                    user.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                    user.role === 'assessor' ? 'bg-emerald-900 text-emerald-200' :
                    'bg-blue-900 text-blue-200'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3 py-1.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-md transition"
                >
                  {t('nav.signIn')}
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow transition"
                >
                  {t('nav.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
