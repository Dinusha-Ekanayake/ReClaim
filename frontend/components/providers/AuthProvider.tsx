'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    void initialize();
    const restoreWhenOnline = () => { void initialize(); };
    const synchronizeSession = (event: StorageEvent) => {
      if (event.key !== 'hasSession') return;
      if (event.newValue === 'true') void useAuthStore.getState().initialize();
      else useAuthStore.getState().clearSession();
    };
    window.addEventListener('online', restoreWhenOnline);
    window.addEventListener('storage', synchronizeSession);
    return () => {
      window.removeEventListener('online', restoreWhenOnline);
      window.removeEventListener('storage', synchronizeSession);
    };
  }, [initialize]);

  return <>{children}</>;
}
