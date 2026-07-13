'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ImagePlus,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Save,
  ShieldQuestion,
  Trash2,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import LocationPicker from '@/components/items/LocationPicker';
import api, { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { CATEGORIES, COLORS, cn, toLocalDateInputValue } from '@/lib/utils';
import type { Item, ItemImage, ItemType } from '@/types';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

type ExistingImage = { kind: 'existing'; id: string; url: string };
type NewImage = { kind: 'new'; key: string; file: File; url: string };
type EditableImage = ExistingImage | NewImage;

interface EditForm {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  color: string;
  size: string;
  locationLabel: string;
  locationArea: string;
  locationLat: number | null;
  locationLng: number | null;
  dateLostFound: string;
  showContactInfo: boolean;
}

interface UploadReceipt {
  url: string;
  publicId: string;
  uploadToken: string;
}

interface InitialEditState {
  form: EditForm;
  questions: string[];
  imageIds: string[];
  wasApproved: boolean;
}

interface ItemUpdatePayload {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  locationLabel?: string;
  locationArea?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  dateLostFound?: string;
  showContactInfo?: boolean;
  verificationQuestions?: string[];
  images?: Array<{ id: string } | UploadReceipt>;
}

const EMPTY_FORM: EditForm = {
  title: '',
  description: '',
  category: '',
  subcategory: '',
  brand: '',
  color: '',
  size: '',
  locationLabel: '',
  locationArea: '',
  locationLat: null,
  locationLng: null,
  dateLostFound: '',
  showContactInfo: false,
};

const MATERIAL_FIELDS = new Set<keyof ItemUpdatePayload>([
  'title', 'description', 'category', 'subcategory', 'brand', 'color', 'size',
  'locationLabel', 'locationArea', 'locationLat', 'locationLng', 'dateLostFound',
  'verificationQuestions', 'images',
]);

function normalizeForm(value: EditForm): EditForm {
  return {
    ...value,
    title: value.title.trim(),
    description: value.description.trim(),
    subcategory: value.subcategory.trim(),
    brand: value.brand.trim(),
    color: value.color.trim(),
    size: value.size.trim(),
    locationLabel: value.locationLabel.trim(),
    locationArea: value.locationArea.trim(),
  };
}

function normalizeQuestions(values: string[]) {
  return values.map((question) => question.trim()).filter(Boolean);
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());

  const [itemType, setItemType] = useState<ItemType>('LOST');
  const [initialState, setInitialState] = useState<InitialEditState | null>(null);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [questions, setQuestions] = useState<string[]>([]);
  const [images, setImages] = useState<EditableImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  const loadItem = useCallback(async (signal?: AbortSignal) => {
    if (!isInitialized || !user) return;
    setLoading(true);
    setError('');
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setInitialState(null);
    setForm(EMPTY_FORM);
    setQuestions([]);
    setImages([]);
    try {
      const item = await api.get<Item>(`/items/${id}`, undefined, { signal });
      if (item.userId !== user.id) {
        setError('Only the person who posted this report can edit it.');
        return;
      }
      const loadedForm = normalizeForm({
        title: item.title,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory ?? '',
        brand: item.brand ?? '',
        color: item.color ?? '',
        size: item.size ?? '',
        locationLabel: item.locationLabel,
        locationArea: item.locationArea ?? item.locationLabel,
        locationLat: Number.isFinite(item.locationLat) ? item.locationLat as number : null,
        locationLng: Number.isFinite(item.locationLng) ? item.locationLng as number : null,
        dateLostFound: item.dateLostFound.slice(0, 10),
        showContactInfo: item.showContactInfo,
      });
      const loadedQuestions = item.type === 'FOUND' ? normalizeQuestions(item.verificationQuestions ?? []) : [];
      const loadedImages = (item.images ?? []).map((image: ItemImage) => ({ kind: 'existing' as const, id: image.id, url: image.url }));
      setInitialState({
        form: loadedForm,
        questions: loadedQuestions,
        imageIds: loadedImages.map((image) => image.id),
        wasApproved: item.isApproved,
      });
      setItemType(item.type);
      setForm(loadedForm);
      setQuestions(loadedQuestions);
      setImages(loadedImages);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setError(messageFor(error, 'This report could not be loaded.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, isInitialized, user]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/items/${id}/edit`)}`);
      return;
    }
    const controller = new AbortController();
    void loadItem(controller.signal);
    return () => controller.abort();
  }, [id, isInitialized, loadItem, router, user]);

  const update = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selected.length) return;
    if (selected.some((file) => !IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES)) {
      setError('Photos must be JPEG, PNG, WebP, or AVIF and no larger than 5 MB each.');
      return;
    }
    const available = MAX_IMAGES - images.length;
    if (available <= 0) return;
    const accepted = selected.slice(0, available).map((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { kind: 'new' as const, key: crypto.randomUUID(), file, url };
    });
    setImages((current) => [...current, ...accepted]);
    if (selected.length > available) setError(`Only ${MAX_IMAGES} photos can be attached. Extra photos were not added.`);
    else setError('');
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const image = current[index];
      if (image?.kind === 'new') {
        URL.revokeObjectURL(image.url);
        previewUrls.current.delete(image.url);
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access. Place the pin manually.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update('locationLat', Number(coords.latitude.toFixed(6)));
        update('locationLng', Number(coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setLocationError('Your location could not be read. Check browser permission or place the pin manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const uploadNewImages = async () => {
    const pending = images.filter((image): image is NewImage => image.kind === 'new');
    if (!pending.length) return { pending, receipts: [] as UploadReceipt[] };
    const body = new FormData();
    pending.forEach((image) => body.append('images', image.file));
    const response = await api.upload<{ images: UploadReceipt[] }>('/upload/images', body);
    return { pending, receipts: response.images ?? [] };
  };

  const changes = useMemo(() => {
    const initial = initialState;
    if (!initial) {
      return {
        payload: {} as ItemUpdatePayload,
        imagesChanged: false,
        hasChanges: false,
        hasMaterialChanges: false,
        returnsToReview: false,
      };
    }

    const current = normalizeForm(form);
    const payload: ItemUpdatePayload = {};
    const setIfChanged = <K extends keyof ItemUpdatePayload>(key: K, value: ItemUpdatePayload[K], initialValue: unknown) => {
      if (!Object.is(value, initialValue)) Object.assign(payload, { [key]: value });
    };

    setIfChanged('title', current.title, initial.form.title);
    setIfChanged('description', current.description, initial.form.description);
    setIfChanged('category', current.category, initial.form.category);
    setIfChanged('subcategory', current.subcategory || null, initial.form.subcategory || null);
    setIfChanged('brand', current.brand || null, initial.form.brand || null);
    setIfChanged('color', current.color || null, initial.form.color || null);
    setIfChanged('size', current.size || null, initial.form.size || null);
    setIfChanged('locationLabel', current.locationLabel, initial.form.locationLabel);
    setIfChanged('locationArea', current.locationArea, initial.form.locationArea);
    setIfChanged('dateLostFound', current.dateLostFound, initial.form.dateLostFound);
    setIfChanged('showContactInfo', current.showContactInfo, initial.form.showContactInfo);

    if (!Object.is(current.locationLat, initial.form.locationLat) || !Object.is(current.locationLng, initial.form.locationLng)) {
      payload.locationLat = current.locationLat;
      payload.locationLng = current.locationLng;
    }

    if (itemType === 'FOUND') {
      const currentQuestions = normalizeQuestions(questions);
      if (!sameList(currentQuestions, initial.questions)) payload.verificationQuestions = currentQuestions;
    }

    const currentImageIds = images.map((image) => image.kind === 'existing' ? image.id : `new:${image.key}`);
    const imagesChanged = !sameList(currentImageIds, initial.imageIds);
    const changedKeys = Object.keys(payload) as Array<keyof ItemUpdatePayload>;
    const hasMaterialChanges = imagesChanged || changedKeys.some((key) => MATERIAL_FIELDS.has(key));

    return {
      payload,
      imagesChanged,
      hasChanges: imagesChanged || changedKeys.length > 0,
      hasMaterialChanges,
      returnsToReview: initial.wasApproved && hasMaterialChanges,
    };
  }, [form, images, initialState, itemType, questions]);

  const validate = () => {
    if (form.title.trim().length < 5) return 'Use a title of at least 5 characters.';
    if (form.description.trim().length < 20) return 'Add at least 20 characters of useful description.';
    if (!form.category) return 'Choose a category.';
    if (form.locationLabel.trim().length < 2) return 'Add the specific location for your private record.';
    if (!form.locationArea.trim()) return 'Add a public area such as a town or landmark.';
    if (!form.dateLostFound) return 'Choose the date lost or found.';
    if ((form.locationLat === null) !== (form.locationLng === null)) return 'Set both latitude and longitude, or remove both.';
    if (itemType === 'FOUND' && !questions.some((question) => question.trim().length >= 3)) return 'Add at least one ownership question for claimants.';
    return '';
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changes.hasChanges) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');
    let uploaded: UploadReceipt[] = [];
    try {
      const { pending, receipts } = changes.imagesChanged
        ? await uploadNewImages()
        : { pending: [] as NewImage[], receipts: [] as UploadReceipt[] };
      uploaded = receipts;
      if (pending.length !== receipts.length) throw new Error('Some photos were not uploaded.');
      const payload: ItemUpdatePayload = { ...changes.payload };
      if (changes.imagesChanged) {
        const receiptByKey = new Map(pending.map((image, index) => [image.key, receipts[index]]));
        payload.images = images.map((image) => {
          if (image.kind === 'existing') return { id: image.id };
          const receipt = receiptByKey.get(image.key);
          if (!receipt) throw new Error('An uploaded photo is missing its receipt.');
          return receipt;
        });
      }

      await api.put(`/items/${id}`, payload);
      setSaved(true);
      router.push(`/items/${id}`);
      router.refresh();
    } catch (error) {
      if (uploaded.length) {
        void api.delete('/upload/images', { uploads: uploaded.map(({ publicId, uploadToken }) => ({ publicId, uploadToken })) }).catch(() => undefined);
      }
      setError(messageFor(error, error instanceof Error ? error.message : 'The report could not be saved. Your changes are still here.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (!isInitialized || (user && loading)) return <EditSkeleton />;
  if (!user) return <EditSkeleton />;

  if (error && !form.title) {
    return (
      <PublicLayout>
        <div className="mx-auto flex min-h-[62dvh] max-w-xl items-center px-4 py-10 text-center"><div className="w-full rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900"><LockKeyhole size={34} className="mx-auto text-amber-500" aria-hidden="true" /><h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">Unable to edit this report</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => void loadItem()} className="btn-primary">Try again</button><Link href="/dashboard/items" className="btn-outline">My reports</Link></div></div></div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <Link href={`/items/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-semibold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"><ArrowLeft size={17} aria-hidden="true" />Back to report</Link>
        <div className="mt-3 flex flex-col gap-3 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between"><div><div className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold', itemType === 'LOST' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300')}>{itemType === 'LOST' ? <MapPin size={13} aria-hidden="true" /> : <PackageCheck size={13} aria-hidden="true" />}{itemType === 'LOST' ? 'Lost report' : 'Found report'}</div><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">Edit report</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep details accurate without exposing private ownership information.</p></div><p className="text-xs font-semibold text-slate-400">Fields marked * are required</p></div>

        {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"><AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
        {saved && <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={17} aria-hidden="true" />Saved. Opening the report…</div>}

        <form onSubmit={handleSave} className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <section className="card p-5 sm:p-6" aria-labelledby="details-heading"><h2 id="details-heading" className="text-lg font-bold text-slate-950 dark:text-white">Report details</h2><div className="mt-5 space-y-5">
              <Field label="Title" id="edit-title" required><input id="edit-title" value={form.title} onChange={(event) => update('title', event.target.value)} minLength={5} maxLength={100} required className="input-field" /></Field>
              <Field label="Description" id="edit-description" required hint={`${form.description.length}/2000`}><textarea id="edit-description" value={form.description} onChange={(event) => update('description', event.target.value)} minLength={20} maxLength={2000} rows={6} required className="input-field resize-y" /></Field>
              <Field label="Category" id="edit-category" required><select id="edit-category" value={form.category} onChange={(event) => update('category', event.target.value)} required className="input-field"><option value="">Choose a category</option>{CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Subcategory" id="edit-subcategory"><input id="edit-subcategory" value={form.subcategory} onChange={(event) => update('subcategory', event.target.value)} maxLength={80} className="input-field" /></Field><Field label="Brand" id="edit-brand"><input id="edit-brand" value={form.brand} onChange={(event) => update('brand', event.target.value)} maxLength={80} className="input-field" /></Field><Field label="Color" id="edit-color"><select id="edit-color" value={form.color} onChange={(event) => update('color', event.target.value)} className="input-field"><option value="">Not specified</option>{COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></Field><Field label="Size" id="edit-size"><input id="edit-size" value={form.size} onChange={(event) => update('size', event.target.value)} maxLength={40} className="input-field" /></Field></div>
              <Field label={itemType === 'LOST' ? 'Date lost' : 'Date found'} id="edit-date" required><input id="edit-date" type="date" value={form.dateLostFound} onChange={(event) => update('dateLostFound', event.target.value)} max={toLocalDateInputValue()} required className="input-field" /></Field>
            </div></section>

            <section className="card p-5 sm:p-6" aria-labelledby="location-heading"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="location-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><MapPin size={18} className="text-primary-600" aria-hidden="true" />Location</h2><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Visitors see the public area and a softened map. Your exact point is limited to you and moderators.</p></div><button type="button" onClick={useCurrentLocation} disabled={locating} className="btn-outline inline-flex shrink-0 items-center justify-center gap-2 px-4"><LocateFixed size={16} aria-hidden="true" />{locating ? 'Locating…' : 'Use my location'}</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Public area" id="edit-area" required><input id="edit-area" value={form.locationArea} onChange={(event) => update('locationArea', event.target.value)} maxLength={160} placeholder="Town, campus, or landmark" required className="input-field" /></Field><Field label="Specific place" id="edit-place" required><input id="edit-place" value={form.locationLabel} onChange={(event) => update('locationLabel', event.target.value)} maxLength={160} placeholder="Private handover context" required className="input-field" /></Field></div>{locationError && <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{locationError}</p>}<div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><LocationPicker lat={form.locationLat} lng={form.locationLng} onChange={(lat, lng) => setForm((current) => ({ ...current, locationLat: lat, locationLng: lng }))} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Latitude" id="edit-lat"><input id="edit-lat" type="number" value={form.locationLat ?? ''} onChange={(event) => update('locationLat', event.target.value === '' ? null : Number(event.target.value))} min={-90} max={90} step="any" className="input-field" /></Field><Field label="Longitude" id="edit-lng"><input id="edit-lng" type="number" value={form.locationLng ?? ''} onChange={(event) => update('locationLng', event.target.value === '' ? null : Number(event.target.value))} min={-180} max={180} step="any" className="input-field" /></Field></div></section>
          </div>

          <div className="min-w-0 space-y-6">
            <section className="card p-5 sm:p-6" aria-labelledby="photos-heading"><div className="flex items-start justify-between gap-3"><div><h2 id="photos-heading" className="text-lg font-bold text-slate-950 dark:text-white">Photos</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Up to {MAX_IMAGES}. The first photo is the cover.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">{images.length}/{MAX_IMAGES}</span></div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={addImages} />
              <div className="mt-4 space-y-3">{images.map((image, index) => <div key={image.kind === 'existing' ? image.id : image.key} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-2 dark:border-slate-700"><span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Image src={image.url} alt={`Photo ${index + 1}`} fill sizes="64px" className="object-cover" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</p><p className="mt-0.5 text-[11px] text-slate-400">{image.kind === 'new' ? 'New upload' : 'Current photo'}</p></div><div className="flex gap-1"><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-800" aria-label={`Move photo ${index + 1} earlier`}><ArrowUp size={15} aria-hidden="true" /></button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-800" aria-label={`Move photo ${index + 1} later`}><ArrowDown size={15} aria-hidden="true" /></button><button type="button" onClick={() => removeImage(index)} className="flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label={`Remove photo ${index + 1}`}><Trash2 size={15} aria-hidden="true" /></button></div></div>)}</div>
              {images.length < MAX_IMAGES && <button type="button" onClick={() => fileInput.current?.click()} className="mt-4 flex min-h-20 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-primary-700 hover:border-primary-400 hover:bg-primary-50 dark:border-slate-700 dark:text-primary-300 dark:hover:bg-primary-500/10"><ImagePlus size={19} aria-hidden="true" />Add photos</button>}
            </section>

            {itemType === 'FOUND' && <section className="card p-5 sm:p-6" aria-labelledby="questions-heading"><div className="flex items-start gap-3"><ShieldQuestion size={20} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" /><div><h2 id="questions-heading" className="text-lg font-bold text-slate-950 dark:text-white">Ownership questions</h2><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Ask for a detail the true owner can answer. Do not put the answer in the question.</p></div></div><div className="mt-4 space-y-3">{questions.map((question, index) => <div key={index} className="flex items-start gap-2"><label htmlFor={`edit-question-${index}`} className="sr-only">Ownership question {index + 1}</label><input id={`edit-question-${index}`} value={question} onChange={(event) => setQuestions((current) => current.map((value, currentIndex) => currentIndex === index ? event.target.value : value))} minLength={3} maxLength={200} className="input-field" placeholder="What unique mark is on the item?" /><button type="button" onClick={() => setQuestions((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label={`Remove ownership question ${index + 1}`}><Minus size={16} aria-hidden="true" /></button></div>)}</div>{questions.length < 5 && <button type="button" onClick={() => setQuestions((current) => [...current, ''])} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"><Plus size={16} aria-hidden="true" />Add question</button>}</section>}

            <section className="card p-5 sm:p-6"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.showContactInfo} onChange={(event) => update('showContactInfo', event.target.checked)} className="mt-1 size-4 rounded accent-primary-600" /><span><span className="block text-sm font-bold text-slate-900 dark:text-white">Share my phone number on this report</span><span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">Only enable this when you are comfortable receiving calls. In-app chat remains available.</span></span></label></section>

            {changes.hasMaterialChanges && (
              <div id="moderation-impact" role="note" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <ShieldQuestion size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{changes.returnsToReview
                  ? 'These edits change public report details. Saving will temporarily remove the report from public search and matching while a moderator reviews the new version.'
                  : 'These edits change public report details. The updated version will remain unavailable to public search and matching until moderation is complete.'}</p>
              </div>
            )}

            <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"><div className="grid grid-cols-2 gap-2"><Link href={`/items/${id}`} className="btn-outline flex items-center justify-center">Cancel</Link><button type="submit" disabled={saving || saved || !changes.hasChanges} aria-describedby={changes.hasMaterialChanges ? 'moderation-impact' : undefined} className="btn-primary flex items-center justify-center gap-2"><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : !changes.hasChanges ? 'No changes' : changes.hasMaterialChanges ? 'Save & send for review' : 'Save changes'}</button></div></div>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}

function Field({ label, id, required = false, hint, children }: Readonly<{ label: string; id: string; required?: boolean; hint?: string; children: React.ReactNode }>) {
  return <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required && <span className="text-red-500"> *</span>}</label>{hint && <span className="text-[11px] text-slate-400">{hint}</span>}</div>{children}</div>;
}

function EditSkeleton() {
  return <PublicLayout><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-label="Loading report editor"><div className="skeleton h-11 w-40 rounded-xl" /><div className="skeleton mt-5 h-20 rounded-2xl" /><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="skeleton h-[680px] rounded-3xl" /><div className="skeleton h-[520px] rounded-3xl" /></div></div></PublicLayout>;
}
