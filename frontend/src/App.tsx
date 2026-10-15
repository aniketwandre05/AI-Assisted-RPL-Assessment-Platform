import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';
import { WorkerProfilePage } from './pages/WorkerProfilePage';
import { QualificationMatchesPage } from './pages/QualificationMatchesPage';
import { AssessorDashboardPage } from './pages/AssessorDashboardPage';
import { AssessmentSessionPage } from './pages/AssessmentSessionPage';
import { CompetencyReportPage } from './pages/CompetencyReportPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PublicVerificationPage } from './pages/PublicVerificationPage';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getInitialRoute = () => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const hash = path.replace('/verify/', '').trim();
      return { view: 'verify', id: hash };
    }
    return { view: 'landing', id: null };
  };

  const initial = getInitialRoute();
  const [currentView, setCurrentView] = useState<string>(initial.view);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initial.id);

  // Automatically redirect to homepage when logged out from a protected view
  useEffect(() => {
    if (!isAuthenticated && !['landing', 'login', 'register', 'verify'].includes(currentView)) {
      setCurrentView('landing');
      setCurrentSessionId(null);
    }
  }, [isAuthenticated, currentView]);

  const handleNavigate = (view: string, id?: string) => {
    if (id !== undefined) {
      setCurrentSessionId(id);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#0b2545] border-t-amber-500 rounded-full mb-3" />
          <p className="font-medium text-sm text-slate-700">Initializing SAKSHAM Platform...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'verify':
        return <PublicVerificationPage signatureHash={currentSessionId || ''} onNavigate={handleNavigate} />;
      case 'worker-dashboard':
        return <WorkerDashboardPage onNavigate={handleNavigate} />;
      case 'worker-profile':
        return <WorkerProfilePage onNavigate={handleNavigate} />;
      case 'worker-matches':
        return <QualificationMatchesPage onNavigate={handleNavigate} />;
      case 'assessor-dashboard':
        return <AssessorDashboardPage onNavigate={handleNavigate} />;
      case 'assessment-session':
        return currentSessionId ? (
          <AssessmentSessionPage sessionId={currentSessionId} onNavigate={handleNavigate} />
        ) : (
          <AssessorDashboardPage onNavigate={handleNavigate} />
        );
      case 'competency-report':
        return currentSessionId ? (
          <CompetencyReportPage sessionId={currentSessionId} onNavigate={handleNavigate} />
        ) : (
          <WorkerDashboardPage onNavigate={handleNavigate} />
        );
      case 'admin-dashboard':
        return <AdminDashboardPage />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />
      <OfflineSyncBanner />
      
      <main className="flex-1 pb-16">
        {renderView()}
      </main>

      <footer className="bg-[#07192f] text-slate-300 text-xs py-8 border-t-2 border-[#133e7c] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <span className="font-bold text-white block text-sm">SAKSHAM - RPL Assessment Platform (SIH26242)</span>
            <span className="text-slate-400">Developed for Ministry of Skill Development and Entrepreneurship (MSDE) & NCVET</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="text-amber-400 font-medium">NSQF Aligned</span>
            <span>•</span>
            <span>Deterministic Rubric Engine</span>
            <span>•</span>
            <span>Human Assessor Governance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
