'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  AlertCircle,
  CheckCircle,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldQuestion,
  Upload,
  X,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import { CATEGORIES, COLORS, cn, toLocalDateInputValue } from '@/lib/utils';
import Link from 'next/link';
import LocationPicker from '@/components/items/LocationPicker';

function NewItemPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = useIsLoggedIn();
  const isInitialized = useAuthStore(s => s.isInitialized);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [hints, setHints] = useState<string[]>(['']);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: searchParams.get('type') === 'FOUND' ? 'FOUND' as const : 'LOST' as const,
    title: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    color: '',
    size: '',
    locationLabel: '',
    locationArea: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    dateLostFound: toLocalDateInputValue(),
    showContactInfo: false,
  });

  if (!isInitialized) {
    return <PublicLayout><div className="min-h-[60vh] flex items-center justify-center"><div className="skeleton h-10 w-48 rounded-xl" /></div></PublicLayout>;
  }

  if (!isLoggedIn) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <LockKeyhole size={48} className="mx-auto mb-4 text-primary-600" aria-hidden="true" />
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Sign in required
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Please sign in to post a lost or found item.
            </p>
            <Link
              href={`/auth/login?next=${encodeURIComponent(`/items/new?${searchParams.toString()}`)}`}
              className="btn-primary inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const update = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleUseCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location access is not available in this browser. You can still enter the area manually.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          locationLat: Number(coords.latitude.toFixed(6)),
          locationLng: Number(coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      () => {
        setLocationError('We could not access your location. Choose a point on the map or enter the area manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const selected = Array.from(e.target.files || []);
    const invalid = selected.find((file) => !allowed.includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setError('Images must be JPEG, PNG, WebP, or AVIF and no larger than 5 MB.');
      e.target.value = '';
      return;
    }
    const files = selected.slice(0, 5 - images.length);

    files.forEach((file) => {
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview }]);
    });
  };

  const removeImage = (i: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const uploadImages = async (): Promise<{ url: string; publicId: string; uploadToken: string }[]> => {
    if (images.length === 0) return [];

    const fd = new FormData();
    images.forEach((img) => fd.append('images', img.file));

    const data = await api.upload('/upload/images', fd);
    return data.images || [];
  };

  const handleSubmit = async () => {
    setError('');

    const cleanedTitle = form.title.trim();
    const cleanedDescription = form.description.trim();

    if (
      !cleanedTitle ||
      !cleanedDescription ||
      !form.category ||
      !form.locationLabel.trim() ||
      !form.locationArea.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (cleanedTitle.length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }

    if (cleanedDescription.length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    const questions = hints.map((hint) => hint.trim()).filter(Boolean);
    if (form.type === 'FOUND' && questions.length === 0) {
      setError('Add at least one ownership question for people claiming this found item.');
      setStep(4);
      return;
    }

    setLoading(true);
    let uploaded: { url: string; publicId: string; uploadToken: string }[] = [];

    try {
      uploaded = await uploadImages();

      const item = await api.post('/items', {
        ...form,
        title: cleanedTitle,
        description: cleanedDescription,
        locationLabel: form.locationLabel.trim(),
        brand: form.brand.trim(),
        color: form.color,
        subcategory: form.subcategory.trim(),
        size: form.size.trim(),
        locationArea: form.locationArea.trim(),
        imageUrls: uploaded.map((u) => u.url),
        imagePublicIds: uploaded.map((u) => u.publicId),
        imageUploadTokens: uploaded.map((u) => u.uploadToken),
        verificationQuestions: questions,
      });

      setSuccess(true);
      setTimeout(() => router.push(`/items/${item.id}`), 1500);
    } catch (err) {
      if (uploaded.length > 0) {
        api.delete('/upload/images', {
          uploads: uploaded.map(({ publicId, uploadToken }) => ({ publicId, uploadToken })),
        }).catch(() => {
          // The original posting error is more useful to the user; cleanup is best-effort.
        });
      }
      setError(err instanceof ApiError ? err.message : 'Failed to post item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <CheckCircle size={64} className="text-secondary-500 dark:text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Report submitted
            </h2>
            <p className="text-gray-500 dark:text-gray-400">It stays private until a moderator approves it. Opening your report…</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const steps = [
    { n: 1, label: 'Basic Info' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Photos' },
    { n: 4, label: 'Verify & Post' },
  ];

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
            <span className="inline-flex items-center gap-3">
              {form.type === 'LOST' ? <Search className="text-red-500" aria-hidden="true" /> : <PackageCheck className="text-secondary-500" aria-hidden="true" />}
              {form.type === 'LOST' ? 'Report Lost Item' : 'Post Found Item'}
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Fill in the details below to help others find and return your item.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => step > s.n && setStep(s.n)}
                className={cn(
                  'w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all',
                  step === s.n
                    ? 'bg-primary-600 text-white scale-110'
                    : step > s.n
                      ? 'bg-secondary-500 text-white cursor-pointer'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {step > s.n ? '✓' : s.n}
              </button>

              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  step === s.n ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {s.label}
              </span>

              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-colors',
                    step > s.n ? 'bg-secondary-400' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card p-5 sm:p-8 space-y-6">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Item Type *
                </label>
                <div className="flex gap-3">
                  {(['LOST', 'FOUND'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => update('type', t)}
                      className={cn(
                        'flex-1 py-4 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2',
                        form.type === t
                          ? t === 'LOST'
                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                            : 'border-green-500 bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      {t === 'LOST' ? <Search size={18} aria-hidden="true" /> : <PackageCheck size={18} aria-hidden="true" />}
                      {t === 'LOST' ? 'I Lost Something' : 'I Found Something'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="item-title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Item Title *
                </label>
                <input
                  id="item-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Black iPhone 15 Pro, Blue Jansport Backpack"
                  className="input-field"
                  minLength={5}
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.title.length}/100
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.value}
                      onClick={() => update('category', cat.value)}
                      className={cn(
                        'p-3 rounded-xl border text-center text-xs font-medium transition-all',
                        form.category === cat.value
                          ? 'border-primary-500 bg-blue-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="item-subcategory" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Subcategory <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="item-subcategory"
                    type="text"
                    value={form.subcategory}
                    onChange={(event) => update('subcategory', event.target.value)}
                    maxLength={80}
                    placeholder="e.g. Mobile phone, school bag"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="item-size" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Size <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="item-size"
                    type="text"
                    value={form.size}
                    onChange={(event) => update('size', event.target.value)}
                    maxLength={40}
                    placeholder="e.g. Small, 15 inch, size M"
                    className="input-field"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="item-description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  id="item-description"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Describe the item in detail. Include any distinguishing features, what was inside, special marks, etc."
                  className="input-field resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.description.length} chars (min 20)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <select
                    value={form.color}
                    onChange={(e) => update('color', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select color</option>
                    {COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => update('brand', e.target.value)}
                    placeholder="e.g. Apple, Samsung, Nike"
                    maxLength={80}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="item-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {form.type === 'LOST' ? 'Date Lost *' : 'Date Found *'}
                  </label>
                  <input
                    id="item-date"
                    type="date"
                    value={form.dateLostFound}
                    onChange={(e) => update('dateLostFound', e.target.value)}
                    max={toLocalDateInputValue()}
                    className="input-field"
                  />
                </div>

                <div>
                  <label htmlFor="item-area" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Public area *
                  </label>
                  <input
                    id="item-area"
                    type="text"
                    value={form.locationArea}
                    onChange={(e) => update('locationArea', e.target.value)}
                    maxLength={160}
                    placeholder="e.g. Colombo 03, Galle Face area"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="item-location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Specific location *
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <MapPin size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                      id="item-location"
                      type="text"
                      value={form.locationLabel}
                      onChange={(event) => update('locationLabel', event.target.value)}
                      maxLength={160}
                      placeholder="e.g. Library entrance, Colombo University"
                      className="input-field pl-10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="btn-outline inline-flex flex-shrink-0 items-center justify-center gap-2 px-4 disabled:opacity-60"
                  >
                    <LocateFixed size={17} aria-hidden="true" />
                    {locating ? 'Locating…' : 'Use my location'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Public visitors see only the approximate area. Exact coordinates help matching and should only be shared during verified coordination.
                </p>
                {locationError && <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">{locationError}</p>}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                <LocationPicker
                  lat={form.locationLat}
                  lng={form.locationLng}
                  onChange={(lat, lng) => setForm((current) => ({ ...current, locationLat: lat, locationLng: lng }))}
                />
                <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Latitude
                    <input
                      type="number"
                      min={-90}
                      max={90}
                      step="any"
                      value={form.locationLat ?? ''}
                      onChange={(event) => update('locationLat', event.target.value === '' ? null : Number(event.target.value))}
                      className="input-field mt-1 font-mono"
                      placeholder="Tap the map"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Longitude
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step="any"
                      value={form.locationLng ?? ''}
                      onChange={(event) => update('locationLng', event.target.value === '' ? null : Number(event.target.value))}
                      className="input-field mt-1 font-mono"
                      placeholder="Tap the map"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <input
                  type="checkbox"
                  id="showContact"
                  checked={form.showContactInfo}
                  onChange={(e) => update('showContactInfo', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="showContact" className="text-sm text-gray-700 dark:text-gray-300">
                  Show my phone number publicly on this listing
                </label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Photos{' '}
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    (up to 5, strongly recommended)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    images.length > 0
                      ? 'border-primary-300 dark:border-primary-500/40 bg-blue-50 dark:bg-primary-500/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-blue-50/30 dark:hover:bg-primary-500/5'
                  )}
                >
                  <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Choose photos
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    JPG, PNG, WebP — Max 5MB each
                  </p>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="sr-only"
                  aria-label="Upload up to five item photos"
                  onChange={handleImages}
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative group">
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <Image src={img.preview} alt="" fill className="object-cover" />
                      </div>

                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary-600 text-white px-1.5 rounded-md font-medium">
                          Main
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-red-500 text-white opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Add another photo"
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center hover:border-primary-400 transition-colors"
                    >
                      <Plus size={24} className="text-gray-400" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              {form.type === 'FOUND' && (
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <ShieldQuestion size={17} className="text-primary-600" aria-hidden="true" />
                    Ownership questions{' '}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      (shown only when someone claims)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ask something the real owner can answer without revealing the answer in the listing. You will review their response before approving a return.
                  </p>

                  <div className="space-y-2">
                    {hints.map((hint, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={hint}
                          onChange={(e) => {
                            const next = [...hints];
                            next[i] = e.target.value;
                            setHints(next);
                          }}
                          placeholder={`Question ${i + 1}, e.g. What is engraved inside the bag?`}
                          minLength={3}
                          maxLength={200}
                          className="input-field flex-1 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => setHints((h) => h.filter((_, j) => j !== i))}
                          aria-label={`Remove ownership question ${i + 1}`}
                          className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}

                    {hints.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setHints((h) => [...h, ''])}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                      >
                        <Plus size={14} /> Add another question
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-3 text-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Review your listing
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    ['Type', form.type],
                    ['Title', form.title],
                    ['Category', form.category],
                    ['Color', form.color || '—'],
                    ['Brand', form.brand || '—'],
                    ['Date', form.dateLostFound],
                    ['Public area', form.locationArea],
                    ['Location detail', form.locationLabel],
                    ['Map point', form.locationLat !== null && form.locationLng !== null ? 'Added' : 'Not added'],
                    ['Photos', `${images.length} image(s)`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-400 dark:text-gray-500 block text-xs">{k}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-outline flex-1"
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && (!form.title.trim() || !form.category)) {
                  setError('Please fill in the title and category.');
                  return;
                }

                if (step === 2 && (!form.description.trim() || !form.locationLabel.trim() || !form.locationArea.trim() || !form.dateLostFound)) {
                  setError('Please fill in description, public area, specific location, and date.');
                  return;
                }

                if (step === 2 && ((form.locationLat === null) !== (form.locationLng === null))) {
                  setError('Add both latitude and longitude, or leave both coordinates empty.');
                  return;
                }

                setError('');
                setStep((s) => s + 1);
              }}
              className="btn-primary flex-1"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {loading ? 'Posting…' : '🚀 Post Item'}
            </button>
          )}
        </div>

        {error && step < 4 && (
          <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
        )}
      </div>
    </PublicLayout>
  );
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewItemPageContent />
    </Suspense>
  );
}
