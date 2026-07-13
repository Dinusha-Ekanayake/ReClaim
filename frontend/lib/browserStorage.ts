type StorageKind = 'local' | 'session';

function storageFor(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function read(kind: StorageKind, key: string): string | null {
  try {
    return storageFor(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(kind: StorageKind, key: string, value: string): boolean {
  try {
    const storage = storageFor(kind);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(kind: StorageKind, key: string): boolean {
  try {
    const storage = storageFor(kind);
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const readLocalStorage = (key: string) => read('local', key);
export const writeLocalStorage = (key: string, value: string) => write('local', key, value);
export const removeLocalStorage = (key: string) => remove('local', key);
export const readSessionStorage = (key: string) => read('session', key);
export const writeSessionStorage = (key: string, value: string) => write('session', key, value);
export const removeSessionStorage = (key: string) => remove('session', key);

export function hasLocalStorageAccess(): boolean {
  const key = '__reclaim_storage_probe__';
  if (!writeLocalStorage(key, '1')) return false;
  removeLocalStorage(key);
  return true;
}
