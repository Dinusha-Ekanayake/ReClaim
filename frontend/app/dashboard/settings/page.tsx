'use client';
import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
  const [deleteError, setDeleteError] = useState('');
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

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
    setDeleteError('');
    try {
      await api.delete('/users/me', { password: deletePassword, confirmation: deleteConfirmation });
      clearSession();
      router.replace('/');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage what appears on your public profile and item reports</p>
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
            <label htmlFor="profile-photo" aria-label="Choose a new public profile photo" className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2">
              {avatarLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              <input id="profile-photo" name="profile-photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Choose profile photo" className="sr-only" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Public on your profile and reports. JPG, PNG, WebP or AVIF; max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Public profile information</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Your name, bio, profile location and photo can be viewed without signing in. Do not enter a home address or private ownership detail.</p>
        </div>

        <div>
          <label htmlFor="profile-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full name <span className="font-normal text-gray-400">(public)</span></label>
          <input id="profile-name" name="name" type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="input-field" maxLength={50} autoComplete="name" />
        </div>

        <div>
          <label htmlFor="profile-bio" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bio <span className="font-normal text-gray-400">(public)</span></label>
          <textarea id="profile-bio" name="bio" value={form.bio} onChange={e => update('bio', e.target.value)}
            rows={3} placeholder="Tell others a bit about yourself..."
            className="input-field resize-none" maxLength={500} aria-describedby="profile-bio-count" />
          <p id="profile-bio-count" className="mt-1 flex justify-between gap-3 text-xs text-gray-400 dark:text-gray-500"><span>Visible on your public profile.</span><span className="tabular-nums">{form.bio.length}/500</span></p>
        </div>

        <div>
          <label htmlFor="profile-location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Profile location <span className="font-normal text-gray-400">(public)</span></label>
          <input id="profile-location" name="location" type="text" value={form.location} onChange={e => update('location', e.target.value)}
            placeholder="e.g. Colombo, Sri Lanka" maxLength={160} autoComplete="address-level2" className="input-field" />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Use a broad city or district, not a street address.</p>
        </div>
      </div>

      {/* Contact */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">Contact & Privacy</h2>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone number <span className="font-normal text-gray-400">(private by default)</span></label>
          <input id="profile-phone" name="phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="+94 77 000 0000" maxLength={20} autoComplete="tel" className="input-field" />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Show phone on listings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">A number appears only when this and contact sharing on that specific report are both enabled.</p>
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
        <Dialog.Root
          open={deleteOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteOpen(open);
            setDeleteError('');
            if (!open) {
              setDeletePassword('');
              setDeleteConfirmation('');
            }
          }}
        >
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 dark:border-red-500/20 dark:bg-red-500/5">
          <h2 className="font-semibold text-red-900 dark:text-red-300">Delete account</h2>
          <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-300/70">Permanently deletes your account, listings, claims you submitted, and conversations you participated in. ReClaim also requests removal of associated uploads; provider caches or backups may expire separately. This cannot be undone.</p>
            <Dialog.Trigger asChild>
              <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10">
                <Trash2 size={15} aria-hidden="true" /> Delete my account
              </button>
            </Dialog.Trigger>
          </div>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[80] bg-gray-950/65 backdrop-blur-sm data-[state=open]:animate-fade-in" />
            <Dialog.Content
              onEscapeKeyDown={(event) => { if (deleting) event.preventDefault(); }}
              onPointerDownOutside={(event) => { if (deleting) event.preventDefault(); }}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancelDeleteRef.current?.focus();
              }}
              className="fixed left-1/2 top-1/2 z-[81] max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-7 shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-900"
            >
              <form onSubmit={handleDeleteAccount} aria-busy={deleting}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">Permanently delete account?</Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Enter your password and type <strong className="text-red-600">DELETE</strong> to confirm. This action cannot be undone.</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button type="button" disabled={deleting} aria-label="Close delete account dialog" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800"><X size={18} aria-hidden="true" /></button>
                  </Dialog.Close>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="delete-account-password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Current password</label>
                    <input id="delete-account-password" name="current-password" type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} required maxLength={128} autoComplete="current-password" className="input-field" aria-invalid={Boolean(deleteError)} />
                  </div>
                  <div>
                    <label htmlFor="delete-account-confirmation" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Type DELETE to confirm</label>
                    <input id="delete-account-confirmation" name="delete-confirmation" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} required maxLength={6} autoComplete="off" placeholder="DELETE" className="input-field" />
                  </div>
                  {deleteError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{deleteError}</p>}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Dialog.Close asChild>
                    <button ref={cancelDeleteRef} type="button" disabled={deleting} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
                  </Dialog.Close>
                  <button type="submit" disabled={deleting || deleteConfirmation !== 'DELETE'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 size={15} aria-hidden="true" /> {deleting ? 'Deleting…' : 'Delete permanently'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
