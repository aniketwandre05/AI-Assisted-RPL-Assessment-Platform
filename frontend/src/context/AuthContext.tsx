import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  syncOfflineQueue: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('rpl_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(offlineStorage.getQueue().length);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when back online
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of logged-in user
    if (token) {
      api.auth.me()
        .then(res => setUser(res.user))
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('rpl_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('rpl_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await api.auth.me();
        setUser(res.user);
      } catch {
        logout();
      }
    }
  };

  const syncOfflineQueue = async (): Promise<number> => {
    if (!navigator.onLine) return 0;
    const queue = offlineStorage.getQueue();
    if (queue.length === 0) return 0;

    let synced = 0;
    for (const item of queue) {
      try {
        if (item.type === 'SCORE_UPDATE' && item.sessionId) {
          await api.assessments.saveScores(item.sessionId, item.payload.scores);
          offlineStorage.removeItem(item.id);
          synced++;
        } else if (item.type === 'PROFILE_SAVE') {
          await api.worker.saveProfile(item.payload);
          offlineStorage.removeItem(item.id);
          synced++;
        } else if (item.type === 'EVIDENCE_ADD' && item.sessionId) {
          await api.assessments.addEvidence(item.sessionId, item.payload);
          offlineStorage.removeItem(item.id);
          synced++;
        }
      } catch (e) {
        console.error('Failed to sync item:', item, e);
      }
    }

    setPendingSyncCount(offlineStorage.getQueue().length);
    return synced;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isOnline,
        pendingSyncCount,
        login,
        logout,
        refreshUser,
        syncOfflineQueue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
