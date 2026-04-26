// 'use client';
// import { useState, useRef } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import Image from 'next/image';
// import { Upload, X, MapPin, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
// import PublicLayout from '@/components/layout/PublicLayout';
// import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
// import api, { ApiError } from '@/lib/api';
// import { CATEGORIES, COLORS, cn } from '@/lib/utils';
// import Link from 'next/link';

// export default function NewItemPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const isLoggedIn = useIsLoggedIn();

//   const [step, setStep] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState(false);
//   const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
//   const [uploadedImages, setUploadedImages] = useState<{ url: string; publicId: string }[]>([]);
//   const [hints, setHints] = useState<string[]>(['']);
//   const fileRef = useRef<HTMLInputElement>(null);

//   const [form, setForm] = useState({
//     type: (searchParams.get('type') as 'LOST' | 'FOUND') || 'LOST',
//     title: '',
//     description: '',
//     category: '',
//     subcategory: '',
//     brand: '',
//     color: '',
//     size: '',
//     locationLabel: '',
//     locationArea: '',
//     dateLostFound: new Date().toISOString().split('T')[0],
//     showContactInfo: false,
//   });

//   if (!isLoggedIn) {
//     return (
//       <PublicLayout>
//         <div className="min-h-[60vh] flex items-center justify-center">
//           <div className="text-center">
//             <div className="text-5xl mb-4">🔐</div>
//             <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Sign in required</h2>
//             <p className="text-gray-500 mb-6">Please sign in to post a lost or found item.</p>
//             <Link href="/auth/login" className="btn-primary">Sign In</Link>
//           </div>
//         </div>
//       </PublicLayout>
//     );
//   }

//   const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

//   const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
//     files.forEach(file => {
//       const preview = URL.createObjectURL(file);
//       setImages(prev => [...prev, { file, preview }]);
//     });
//   };

//   const removeImage = (i: number) => {
//     setImages(prev => prev.filter((_, idx) => idx !== i));
//   };

//   const uploadImages = async (): Promise<{ url: string; publicId: string }[]> => {
//     if (images.length === 0) return [];
//     const fd = new FormData();
//     images.forEach(img => fd.append('images', img.file));
//     const data = await api.upload('/upload/images', fd);
//     return data.images;
//   };

//   const handleSubmit = async () => {
//     setError('');
//     if (!form.title.trim() || !form.description.trim() || !form.category || !form.locationLabel) {
//       setError('Please fill in all required fields.');
//       return;
//     }
//     if (form.description.length < 20) {
//       setError('Description must be at least 20 characters.');
//       return;
//     }
//     setLoading(true);
//     try {
//       const uploaded = await uploadImages();
//       const item = await api.post('/items', {
//         ...form,
//         imageUrls: uploaded.map(u => u.url),
//         imagePublicIds: uploaded.map(u => u.publicId),
//         verificationHints: hints.filter(Boolean),
//       });
//       setSuccess(true);
//       setTimeout(() => router.push(`/items/${item.id}`), 1500);
//     } catch (err) {
//       setError(err instanceof ApiError ? err.message : 'Failed to post item. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (success) {
//     return (
//       <PublicLayout>
//         <div className="min-h-[60vh] flex items-center justify-center">
//           <div className="text-center animate-fade-in">
//             <CheckCircle size={64} className="text-secondary-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Item Posted!</h2>
//             <p className="text-gray-500">Redirecting to your item…</p>
//           </div>
//         </div>
//       </PublicLayout>
//     );
//   }

//   const steps = [
//     { n: 1, label: 'Basic Info' },
//     { n: 2, label: 'Details' },
//     { n: 3, label: 'Photos' },
//     { n: 4, label: 'Verify & Post' },
//   ];

//   return (
//     <PublicLayout>
//       <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
//         <div className="mb-8">
//           <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
//             {form.type === 'LOST' ? '🔍 Report Lost Item' : '📦 Post Found Item'}
//           </h1>
//           <p className="text-gray-500">Fill in the details below to help others find and return your item.</p>
//         </div>

//         {/* Step indicator */}
//         <div className="flex items-center gap-2 mb-8">
//           {steps.map((s, i) => (
//             <div key={s.n} className="flex items-center gap-2 flex-1">
//               <button onClick={() => step > s.n && setStep(s.n)}
//                 className={cn('w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all',
//                   step === s.n ? 'bg-primary-600 text-white scale-110' :
//                   step > s.n ? 'bg-secondary-500 text-white cursor-pointer' :
//                   'bg-gray-200 text-gray-500')}>
//                 {step > s.n ? '✓' : s.n}
//               </button>
//               <span className={cn('text-xs font-medium hidden sm:block',
//                 step === s.n ? 'text-primary-600' : 'text-gray-400')}>{s.label}</span>
//               {i < steps.length - 1 && (
//                 <div className={cn('flex-1 h-0.5 transition-colors', step > s.n ? 'bg-secondary-400' : 'bg-gray-200')} />
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="card p-8 space-y-6">
//           {/* Step 1: Basic Info */}
//           {step === 1 && (
//             <>
//               {/* Type */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-3">Item Type *</label>
//                 <div className="flex gap-3">
//                   {(['LOST', 'FOUND'] as const).map(t => (
//                     <button key={t} onClick={() => update('type', t)}
//                       className={cn('flex-1 py-4 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2',
//                         form.type === t
//                           ? t === 'LOST' ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700'
//                           : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
//                       {t === 'LOST' ? '🔍 I Lost Something' : '📦 I Found Something'}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Title */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">Item Title *</label>
//                 <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
//                   placeholder="e.g. Black iPhone 15 Pro, Blue Jansport Backpack"
//                   className="input-field" maxLength={100} />
//                 <p className="text-xs text-gray-400 mt-1">{form.title.length}/100</p>
//               </div>

//               {/* Category */}
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
//                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
//                   {CATEGORIES.map(cat => (
//                     <button key={cat.value} onClick={() => update('category', cat.value)}
//                       className={cn('p-3 rounded-xl border text-center text-xs font-medium transition-all',
//                         form.category === cat.value
//                           ? 'border-primary-500 bg-blue-50 text-primary-700'
//                           : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
//                       <div className="text-xl mb-1">{cat.icon}</div>
//                       {cat.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             </>
//           )}

//           {/* Step 2: Details */}
//           {step === 2 && (
//             <>
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
//                 <textarea value={form.description} onChange={e => update('description', e.target.value)}
//                   rows={5} placeholder="Describe the item in detail. Include any distinguishing features, what was inside, special marks, etc."
//                   className="input-field resize-none" />
//                 <p className="text-xs text-gray-400 mt-1">{form.description.length} chars (min 20)</p>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
//                   <select value={form.color} onChange={e => update('color', e.target.value)} className="input-field">
//                     <option value="">Select color</option>
//                     {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
//                   <input type="text" value={form.brand} onChange={e => update('brand', e.target.value)}
//                     placeholder="e.g. Apple, Samsung, Nike" className="input-field" />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     {form.type === 'LOST' ? 'Date Lost *' : 'Date Found *'}
//                   </label>
//                   <input type="date" value={form.dateLostFound}
//                     onChange={e => update('dateLostFound', e.target.value)}
//                     max={new Date().toISOString().split('T')[0]} className="input-field" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Location *
//                   </label>
//                   <input type="text" value={form.locationLabel} onChange={e => update('locationLabel', e.target.value)}
//                     placeholder="e.g. Near Colombo University, Galle Face" className="input-field" />
//                 </div>
//               </div>

//               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
//                 <input type="checkbox" id="showContact" checked={form.showContactInfo}
//                   onChange={e => update('showContactInfo', e.target.checked)}
//                   className="w-4 h-4 text-primary-600 rounded" />
//                 <label htmlFor="showContact" className="text-sm text-gray-700">
//                   Show my phone number publicly on this listing
//                 </label>
//               </div>
//             </>
//           )}

//           {/* Step 3: Photos */}
//           {step === 3 && (
//             <>
//               <div>
//                 <label className="block text-sm font-semibold text-gray-700 mb-3">
//                   Photos <span className="text-gray-400 font-normal">(up to 5, strongly recommended)</span>
//                 </label>
//                 <div
//                   onClick={() => fileRef.current?.click()}
//                   className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
//                     images.length > 0 ? 'border-primary-300 bg-blue-50' : 'border-gray-300 hover:border-primary-400 hover:bg-blue-50/30')}>
//                   <Upload size={32} className="mx-auto text-gray-400 mb-3" />
//                   <p className="text-sm font-medium text-gray-700">Click to upload images</p>
//                   <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — Max 5MB each</p>
//                   <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
//                     onChange={handleImages} />
//                 </div>
//               </div>

//               {images.length > 0 && (
//                 <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
//                   {images.map((img, i) => (
//                     <div key={i} className="relative group">
//                       <div className="aspect-square rounded-xl overflow-hidden border border-gray-200">
//                         <Image src={img.preview} alt="" fill className="object-cover" />
//                       </div>
//                       {i === 0 && (
//                         <span className="absolute bottom-1 left-1 text-[10px] bg-primary-600 text-white px-1.5 rounded-md font-medium">
//                           Main
//                         </span>
//                       )}
//                       <button onClick={() => removeImage(i)}
//                         className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
//                         <X size={10} />
//                       </button>
//                     </div>
//                   ))}
//                   {images.length < 5 && (
//                     <button onClick={() => fileRef.current?.click()}
//                       className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 transition-colors">
//                       <Plus size={24} className="text-gray-400" />
//                     </button>
//                   )}
//                 </div>
//               )}
//             </>
//           )}

//           {/* Step 4: Verification Hints + Review */}
//           {step === 4 && (
//             <>
//               {form.type === 'FOUND' && (
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1">
//                     Verification Hints <span className="text-gray-400 font-normal">(hidden from public)</span>
//                   </label>
//                   <p className="text-xs text-gray-500 mb-3">
//                     Add hidden details that only the real owner would know. Claimants must answer correctly.
//                   </p>
//                   <div className="space-y-2">
//                     {hints.map((hint, i) => (
//                       <div key={i} className="flex gap-2">
//                         <input type="text" value={hint} onChange={e => {
//                           const next = [...hints];
//                           next[i] = e.target.value;
//                           setHints(next);
//                         }}
//                           placeholder={`Hidden detail ${i + 1} (e.g. "There's a crack on the left corner")`}
//                           className="input-field flex-1 text-sm" />
//                         <button onClick={() => setHints(h => h.filter((_, j) => j !== i))}
//                           className="p-2.5 text-gray-400 hover:text-red-500 transition-colors">
//                           <Minus size={16} />
//                         </button>
//                       </div>
//                     ))}
//                     {hints.length < 5 && (
//                       <button onClick={() => setHints(h => [...h, ''])}
//                         className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
//                         <Plus size={14} /> Add another hint
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Summary */}
//               <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
//                 <h3 className="font-semibold text-gray-900">Review your listing</h3>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
//                   {[
//                     ['Type', form.type],
//                     ['Title', form.title],
//                     ['Category', form.category],
//                     ['Color', form.color || '—'],
//                     ['Brand', form.brand || '—'],
//                     ['Date', form.dateLostFound],
//                     ['Location', form.locationLabel],
//                     ['Photos', `${images.length} image(s)`],
//                   ].map(([k, v]) => (
//                     <div key={k}>
//                       <span className="text-gray-400 block text-xs">{k}</span>
//                       <span className="text-gray-900 font-medium">{v}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {error && (
//                 <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
//                   <AlertCircle size={16} /> {error}
//                 </div>
//               )}
//             </>
//           )}
//         </div>

//         {/* Nav buttons */}
//         <div className="flex gap-3 mt-6">
//           {step > 1 && (
//             <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-1">
//               Back
//             </button>
//           )}
//           {step < 4 ? (
//             <button onClick={() => {
//               if (step === 1 && (!form.title || !form.category)) {
//                 setError('Please fill in the title and category.');
//                 return;
//               }
//               if (step === 2 && (!form.description || !form.locationLabel || !form.dateLostFound)) {
//                 setError('Please fill in description, location, and date.');
//                 return;
//               }
//               setError('');
//               setStep(s => s + 1);
//             }} className="btn-primary flex-1">
//               Continue
//             </button>
//           ) : (
//             <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
//               {loading ? 'Posting…' : '🚀 Post Item'}
//             </button>
//           )}
//         </div>
//         {error && step < 4 && (
//           <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
//         )}
//       </div>
//     </PublicLayout>
//   );
// }

'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import { useIsLoggedIn } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import { CATEGORIES, COLORS, cn } from '@/lib/utils';
import Link from 'next/link';

function NewItemPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = useIsLoggedIn();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [hints, setHints] = useState<string[]>(['']);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: (searchParams.get('type') as 'LOST' | 'FOUND') || 'LOST',
    title: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    color: '',
    size: '',
    locationLabel: '',
    locationArea: '',
    dateLostFound: new Date().toISOString().split('T')[0],
    showContactInfo: false,
  });

  if (!isLoggedIn) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Sign in required
            </h2>
            <p className="text-gray-500 mb-6">
              Please sign in to post a lost or found item.
            </p>
            <Link href="/auth/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const update = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);

    files.forEach((file) => {
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview }]);
    });
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const uploadImages = async (): Promise<{ url: string; publicId: string }[]> => {
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
      !form.locationLabel.trim()
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

    setLoading(true);

    try {
      const uploaded = await uploadImages();

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
        verificationHints: hints.map((h) => h.trim()).filter(Boolean),
      });

      setSuccess(true);
      setTimeout(() => router.push(`/items/${item.id}`), 1500);
    } catch (err) {
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
            <CheckCircle size={64} className="text-secondary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Item Posted!
            </h2>
            <p className="text-gray-500">Redirecting to your item…</p>
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
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            {form.type === 'LOST' ? '🔍 Report Lost Item' : '📦 Post Found Item'}
          </h1>
          <p className="text-gray-500">
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
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                {step > s.n ? '✓' : s.n}
              </button>

              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  step === s.n ? 'text-primary-600' : 'text-gray-400'
                )}
              >
                {s.label}
              </span>

              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-colors',
                    step > s.n ? 'bg-secondary-400' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card p-8 space-y-6">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {t === 'LOST' ? '🔍 I Lost Something' : '📦 I Found Something'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Title *
                </label>
                <input
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                          ? 'border-primary-500 bg-blue-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      )}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={5}
                  placeholder="Describe the item in detail. Include any distinguishing features, what was inside, special marks, etc."
                  className="input-field resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.description.length} chars (min 20)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => update('brand', e.target.value)}
                    placeholder="e.g. Apple, Samsung, Nike"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {form.type === 'LOST' ? 'Date Lost *' : 'Date Found *'}
                  </label>
                  <input
                    type="date"
                    value={form.dateLostFound}
                    onChange={(e) => update('dateLostFound', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={form.locationLabel}
                    onChange={(e) => update('locationLabel', e.target.value)}
                    placeholder="e.g. Near Colombo University, Galle Face"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="showContact"
                  checked={form.showContactInfo}
                  onChange={(e) => update('showContactInfo', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="showContact" className="text-sm text-gray-700">
                  Show my phone number publicly on this listing
                </label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Photos{' '}
                  <span className="text-gray-400 font-normal">
                    (up to 5, strongly recommended)
                  </span>
                </label>

                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    images.length > 0
                      ? 'border-primary-300 bg-blue-50'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-blue-50/30'
                  )}
                >
                  <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload images
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, WebP — Max 5MB each
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImages}
                  />
                </div>
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
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 transition-colors"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Verification Hints{' '}
                    <span className="text-gray-400 font-normal">
                      (hidden from public)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Add hidden details that only the real owner would know.
                    Claimants must answer correctly.
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
                          placeholder={`Hidden detail ${i + 1}`}
                          className="input-field flex-1 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => setHints((h) => h.filter((_, j) => j !== i))}
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
                        <Plus size={14} /> Add another hint
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
                <h3 className="font-semibold text-gray-900">
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
                    ['Location', form.locationLabel],
                    ['Photos', `${images.length} image(s)`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-400 block text-xs">{k}</span>
                      <span className="text-gray-900 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
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

                if (step === 2 && (!form.description.trim() || !form.locationLabel.trim() || !form.dateLostFound)) {
                  setError('Please fill in description, location, and date.');
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