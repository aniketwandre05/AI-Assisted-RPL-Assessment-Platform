import React from 'react';
import { useAuth } from '../context/AuthContext';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, pendingSyncCount, syncOfflineQueue } = useAuth();
  const [syncedCount, setSyncedCount] = React.useState<number | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const count = await syncOfflineQueue();
    setIsSyncing(false);
    setSyncedCount(count);
    setTimeout(() => setSyncedCount(null), 4000);
  };

  if (isOnline && pendingSyncCount === 0 && syncedCount === null) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Working Offline:</strong> All form entries, checklist scores, and drafts are safely stored on your device and will survive page refreshes.
              </span>
            </>
          ) : syncedCount !== null ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800">
                Successfully synchronized {syncedCount} offline records to the national server!
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>
                You have <strong>{pendingSyncCount} pending change(s)</strong> captured offline ready to synchronize.
              </span>
            </>
          )}
        </div>

        {isOnline && pendingSyncCount > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-md shadow-sm transition flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Changes Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
