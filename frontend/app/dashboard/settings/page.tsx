'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, Save, AlertCircle, CheckCircle, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import { getAvatarFallback } from '@/lib/utils';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const clearSession = useAuthStore(s => s.clearSession);
  const router = useRouter();

  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    phone: user?.phone || '',
    showPhone: user?.showPhone || false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      location: user.location || '',
      phone: user.phone || '',
      showPhone: user.showPhone || false,
    });
  }, [user?.id]);

  useEffect(() => {
    if (!deleteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) setDeleteOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteOpen, deleting]);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (form.name.trim().length < 2) {
      setError('Name must contain at least 2 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await api.patch('/users/me', form);
      updateUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or AVIF image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photos must be 5MB or smaller.');
      e.target.value = '';
      return;
    }
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const data = await api.upload('/users/me/avatar', fd);
      updateUser({ avatarUrl: data.avatarUrl });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the profile photo.');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (deleteConfirmation !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await api.delete('/users/me', { password: deletePassword, confirmation: deleteConfirmation });
      clearSession();
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the account.');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your profile and preferences</p>
      </div>

      {/* Avatar */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} width={80} height={80}
                className="rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 text-2xl font-bold flex items-center justify-center">
                {getAvatarFallback(user?.name || 'U')}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
              {avatarLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG or WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">Profile Information</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="input-field" maxLength={50} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
            rows={3} placeholder="Tell others a bit about yourself..."
            className="input-field resize-none" maxLength={500} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{form.bio.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
          <input type="text" value={form.location} onChange={e => update('location', e.target.value)}
            placeholder="e.g. Colombo, Sri Lanka" maxLength={160} className="input-field" />
        </div>
      </div>

      {/* Contact */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">Contact & Privacy</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="+94 77 000 0000" maxLength={20} autoComplete="tel" className="input-field" />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Show phone on listings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Allow others to call you directly from your item pages</p>
          </div>
          <button onClick={() => update('showPhone', !form.showPhone)}
            type="button" role="switch" aria-checked={form.showPhone} aria-label="Show phone number on listings"
            className={`w-12 h-6 rounded-full transition-colors relative ${form.showPhone ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showPhone ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 rounded-xl text-sm">
          <CheckCircle size={16} /> Settings saved successfully!
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="btn-primary flex items-center gap-2 disabled:opacity-60">
        <Save size={16} />
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      {user?.role === 'USER' && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 dark:border-red-500/20 dark:bg-red-500/5">
          <h2 className="font-semibold text-red-900 dark:text-red-300">Delete account</h2>
          <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-300/70">Permanently deletes your profile, listings, claims, chats, and uploaded assets. This cannot be undone.</p>
          <button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10">
            <Trash2 size={15} /> Delete my account
          </button>
        </div>
      )}

      {deleteOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/65 p-4 backdrop-blur-sm">
          <form onSubmit={handleDeleteAccount} className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl dark:bg-gray-900">
            <button type="button" aria-label="Close" onClick={() => setDeleteOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
            <h2 id="delete-account-title" className="text-xl font-bold text-gray-900 dark:text-white">Permanently delete account?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Enter your password and type <strong className="text-red-600">DELETE</strong> to confirm.</p>
            <div className="mt-5 space-y-4">
              <input type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} required maxLength={128} autoComplete="current-password" placeholder="Current password" className="input-field" />
              <input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} required maxLength={6} autoComplete="off" placeholder="Type DELETE" className="input-field" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
              <button disabled={deleting || deleteConfirmation !== 'DELETE'} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
