'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Camera, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import { getAvatarFallback } from '@/lib/utils';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

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

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
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
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const data = await api.upload('/users/me/avatar', fd);
      updateUser({ avatarUrl: data.avatarUrl });
    } catch {}
    finally { setAvatarLoading(false); }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Account Settings</h1>
        <p className="text-gray-500 text-sm">Manage your profile and preferences</p>
      </div>

      {/* Avatar */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Photo</h2>
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
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Profile Information</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="input-field" maxLength={50} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
          <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
            rows={3} placeholder="Tell others a bit about yourself..."
            className="input-field resize-none" maxLength={300} />
          <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          <input type="text" value={form.location} onChange={e => update('location', e.target.value)}
            placeholder="e.g. Colombo, Sri Lanka" className="input-field" />
        </div>
      </div>

      {/* Contact */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Contact & Privacy</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="+94 77 000 0000" className="input-field" />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900">Show phone on listings</p>
            <p className="text-xs text-gray-500">Allow others to call you directly from your item pages</p>
          </div>
          <button onClick={() => update('showPhone', !form.showPhone)}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.showPhone ? 'bg-primary-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showPhone ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl text-sm">
          <CheckCircle size={16} /> Settings saved successfully!
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="btn-primary flex items-center gap-2 disabled:opacity-60">
        <Save size={16} />
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
