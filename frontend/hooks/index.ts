import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Item, PaginatedResponse } from '@/types';

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── useItems ─────────────────────────────────────────────────────────────────
interface UseItemsOptions {
  type?: string;
  category?: string;
  search?: string;
  status?: string;
  color?: string;
  brand?: string;
  sort?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useItems(options: UseItemsOptions = {}) {
  const { enabled = true, ...params } = options;
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data: PaginatedResponse<Item> = await api.get('/items', {
        ...params,
        order: 'desc',
      } as any);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), enabled]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, pagination, loading, error, refetch: fetch };
}

// ─── useItem ──────────────────────────────────────────────────────────────────
export function useItem(id: string | null) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/items/${id}`)
      .then(setItem)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { item, loading, error };
}

// ─── useLocalStorage ─────────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stored) : value;
      setStored(valueToStore);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch {}
  };

  return [stored, setValue] as const;
}

// ─── useClickOutside ─────────────────────────────────────────────────────────
export function useClickOutside<T extends HTMLElement>(
  callback: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);
  return ref;
}
