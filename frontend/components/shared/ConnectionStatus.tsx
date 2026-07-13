'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

type State = 'checking' | 'online' | 'offline' | 'restored';

const API_URL = '/api';

export default function ConnectionStatus() {
  const [state, setState] = useState<State>('checking');
  const previous = useRef<State>('checking');

  const check = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      // Browser connectivity uses the lightweight liveness endpoint. Database
      // readiness is reserved for the deployment platform's health probe.
      const response = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: controller.signal });
      const next: State = response.ok ? (previous.current === 'offline' ? 'restored' : 'online') : 'offline';
      previous.current = response.ok ? 'online' : 'offline';
      setState(next);
      if (next === 'restored') window.setTimeout(() => setState('online'), 3000);
    } catch {
      previous.current = 'offline';
      setState('offline');
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = window.setInterval(check, 120000);
    window.addEventListener('online', check);
    const offline = () => { previous.current = 'offline'; setState('offline'); };
    window.addEventListener('offline', offline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', offline);
    };
  }, [check]);

  if (state === 'checking' || state === 'online') return null;

  return (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-4 z-[95] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur-xl animate-slide-in-up ${state === 'restored' ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/95 dark:text-emerald-300' : 'border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/95 dark:text-amber-200'}`}>
      {state === 'restored' ? <Wifi size={18} /> : <WifiOff size={18} />}
      <span>{state === 'restored' ? 'Connection restored' : 'ReClaim is reconnecting to its data service'}</span>
      {state === 'offline' && (
        <button type="button" onClick={check} aria-label="Retry connection" className="rounded-lg p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900"><RefreshCw size={15} /></button>
      )}
    </div>
  );
}
