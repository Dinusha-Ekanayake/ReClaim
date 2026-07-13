'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSessionAccessToken, refreshSession } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationStore } from '@/lib/store/notificationStore';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'recovering' | 'disconnected' | 'error';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isRecovering: boolean;
  status: SocketStatus;
  error: string | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  isRecovering: false,
  status: 'idle',
  error: null,
  reconnect: () => undefined,
});

const AUTH_RECOVERY_CODES = new Set(['TOKEN_EXPIRED', 'AUTH_INVALID', 'AUTH_REQUIRED']);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectRef = useRef<() => void>(() => undefined);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNew);
  const reconnect = useCallback(() => reconnectRef.current(), []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      reconnectRef.current = () => undefined;
      setSocket(null);
      setStatus('idle');
      setError(null);
      return;
    }

    let disposed = false;
    let recoveryAttempts = 0;
    let recoveryActive = false;
    let recoveryPromise: Promise<void> | null = null;
    const token = getSessionAccessToken();
    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.35,
    });

    const recoverAuthentication = (manual = false) => {
      if (disposed || recoveryPromise) return recoveryPromise;
      if (manual) recoveryAttempts = 0;
      if (recoveryAttempts >= 1) {
        setStatus('error');
        setError('Your live session could not be restored. Try reconnecting.');
        return null;
      }

      recoveryAttempts += 1;
      recoveryActive = true;
      setStatus('recovering');
      setError(null);

      const operation = (async () => {
        newSocket.disconnect();
        let refreshedToken: string | null;
        try {
          refreshedToken = await refreshSession();
        } catch {
          setStatus('error');
          setError('The session service is temporarily unavailable. Try reconnecting.');
          return;
        }
        if (disposed) return;
        if (!refreshedToken) {
          setStatus('error');
          setError('Your session expired. Sign in again or retry when you are online.');
          return;
        }
        newSocket.auth = { token: refreshedToken };
        setStatus('connecting');
        newSocket.connect();
      })().finally(() => {
        recoveryActive = false;
        recoveryPromise = null;
      });

      recoveryPromise = operation;
      return operation;
    };

    const handleConnect = () => {
      if (disposed) return;
      recoveryAttempts = 0;
      setStatus('connected');
      setError(null);
    };
    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      if (disposed || recoveryActive) return;
      if (reason === 'io server disconnect') {
        void recoverAuthentication();
        return;
      }
      setStatus(newSocket.active ? 'connecting' : 'disconnected');
      setError(newSocket.active ? null : 'Live updates are disconnected.');
    };
    const handleConnectError = (connectionError: Error & { data?: { code?: string } }) => {
      if (disposed || recoveryActive) return;
      if (connectionError.data?.code && AUTH_RECOVERY_CODES.has(connectionError.data.code)) {
        void recoverAuthentication();
        return;
      }
      setStatus('error');
      setError(connectionError.message || 'Could not connect to live updates.');
    };
    const handleAuthExpired = () => {
      if (!recoveryActive) void recoverAuthentication();
    };
    const handleReconnectAttempt = () => {
      if (!disposed && !recoveryActive) {
        setStatus('connecting');
        setError(null);
      }
    };
    const handleReconnectFailed = () => {
      if (!disposed) {
        setStatus('error');
        setError('Live updates could not reconnect.');
      }
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('auth:expired', handleAuthExpired);
    newSocket.on('notification:new', addNotification);
    newSocket.io.on('reconnect_attempt', handleReconnectAttempt);
    newSocket.io.on('reconnect_failed', handleReconnectFailed);

    socketRef.current = newSocket;
    setSocket(newSocket);
    setStatus('connecting');
    setError(null);
    reconnectRef.current = () => { void recoverAuthentication(true); };
    newSocket.connect();

    return () => {
      disposed = true;
      reconnectRef.current = () => undefined;
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);
      newSocket.io.off('reconnect_failed', handleReconnectFailed);
      newSocket.removeAllListeners();
      newSocket.disconnect();
      if (socketRef.current === newSocket) socketRef.current = null;
      setSocket((current) => (current === newSocket ? null : current));
    };
  }, [user?.id, addNotification]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected: status === 'connected',
        isRecovering: status === 'recovering',
        status,
        error,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
