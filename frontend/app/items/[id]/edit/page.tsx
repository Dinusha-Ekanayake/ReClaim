'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import { useAuthStore } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import { CATEGORIES, COLORS } from '@/lib/utils';

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const user    = useAuthStore(s => s.user);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [form, setForm] = useState<any>({
    title: '', description: '', category: '', subcategory: '',
    brand: '', color: '', size: '', locationLabel: '',
    dateLostFound: '', showContactInfo: false,
    verificationHints: [],
  });

  useEffect(() => {
    api.get(`/items/${id}`).then(item => {
      if (item.userId !== user?.id) { router.push('/dashboard/items'); return; }
      setForm({
        title:             item.title,
        description:       item.description,
        category:          item.category,
        subcategory:       item.subcategory || '',
        brand:             item.brand || '',
        color:             item.color || '',
        size:              item.size  || '',
        locationLabel:     item.locationLabel,
        dateLostFound:     item.dateLostFound.split('T')[0],
        showContactInfo:   item.showContactInfo,
        verificationHints: item.verificationHints || [],
      });
    }).catch(() => router.push('/dashboard/items'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.put(`/items/${id}`, form);
      setSuccess(true);
      setTimeout(() => router.push(`/items/${id}`), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Edit Item</h1>
        <p className="text-gray-500 mb-8 text-sm">Update your listing details</p>

        <div className="card p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              className="input-field" maxLength={100} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => set('category', cat.value)}
                  className={`p-3 rounded-xl border text-center text-xs font-medium transition-all
                    ${form.category === cat.value ? 'border-primary-500 bg-blue-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  <div className="text-xl mb-1">{cat.icon}</div>{cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={5} className="input-field resize-none" />
          </div>

          {/* Color + Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
              <select value={form.color} onChange={e => set('color', e.target.value)} className="input-field">
                <option value="">Select color</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
              <input type="text" value={form.brand} onChange={e => set('brand', e.target.value)}
                placeholder="e.g. Apple, Nike" className="input-field" />
            </div>
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
              <input type="text" value={form.locationLabel} onChange={e => set('locationLabel', e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Lost/Found *</label>
              <input type="date" value={form.dateLostFound} onChange={e => set('dateLostFound', e.target.value)}
                max={new Date().toISOString().split('T')[0]} className="input-field" />
            </div>
          </div>

          {/* Show contact */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input type="checkbox" id="showContact" checked={form.showContactInfo}
              onChange={e => set('showContactInfo', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded" />
            <label htmlFor="showContact" className="text-sm text-gray-700">
              Show my phone number publicly on this listing
            </label>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl text-sm">
              <CheckCircle size={16} /> Saved! Redirecting…
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => router.back()} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}
