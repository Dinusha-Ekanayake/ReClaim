'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flag,
  ImageIcon,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ClaimModal from '@/components/items/ClaimModal';
import CommentSection from '@/components/items/CommentSection';
import MapView from '@/components/items/MapView';
import MatchCard from '@/components/items/MatchCard';
import api, { ApiError } from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { cn, formatDate, getAvatarFallback, getStatusColor, getStatusLabel } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { Item, ItemStatus, Match } from '@/types';

type ItemDetails = Item & {
  user?: Item['user'] & { _count?: { items: number } };
};

const REPORT_REASONS = [
  { value: 'FAKE', label: 'False or misleading listing' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'WRONG_CATEGORY', label: 'Wrong category' },
  { value: 'OTHER', label: 'Another concern' },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useIsLoggedIn();
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const loadItem = useCallback(async (signal?: AbortSignal) => {
    if (!isInitialized) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<ItemDetails>(`/items/${id}`, undefined, { signal });
      setItem(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setItem(null);
      setError(getErrorMessage(error, 'This item could not be loaded.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, isInitialized]);

  useEffect(() => {
    const controller = new AbortController();
    void loadItem(controller.signal);
    return () => controller.abort();
  }, [loadItem]);

  const isOwner = item?.userId === user?.id;

  useEffect(() => {
    setActiveImage(0);
  }, [item?.id, item?.images?.length]);

  useEffect(() => {
    if (!item || !isOwner) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    api.get<Match[]>(`/matches/${item.id}`, undefined, { signal: controller.signal })
      .then(setMatches)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast({ title: 'Match suggestions unavailable', description: getErrorMessage(error, 'Please try again later.'), variant: 'destructive' });
        }
      });
    return () => controller.abort();
  }, [isOwner, item]);

  const handleStartChat = async () => {
    if (!item) return;
    if (!isLoggedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(`/items/${item.id}`)}`);
      return;
    }
    setAction('chat');
    try {
      const chat = await api.post<{ id: string }>('/chats', { recipientId: item.userId, itemId: item.id });
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      toast({ title: 'Could not start chat', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' });
      setAction(null);
    }
  };

  const handleStatusUpdate = async (status: ItemStatus) => {
    if (!item || action) return;
    setAction(`status-${status}`);
    try {
      const updated = await api.patch<ItemDetails>(`/items/${item.id}/status`, { status });
      setItem((current) => current ? { ...current, status: updated.status } : current);
      toast({ title: 'Listing updated', description: `This report is now ${getStatusLabel(status).toLowerCase()}.` });
    } catch (error) {
      toast({ title: 'Could not update status', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' });
    } finally {
      setAction(null);
    }
  };

  const handleDelete = async () => {
    if (!item || action) return;
    setAction('delete');
    try {
      await api.delete(`/items/${item.id}`);
      toast({ title: 'Listing deleted', description: 'The report and its associated data were removed.' });
      router.replace('/dashboard/items');
    } catch (error) {
      toast({ title: 'Could not delete listing', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' });
      setAction(null);
    }
  };

  if (!isInitialized || loading) return <ItemDetailSkeleton />;

  if (!item) {
    return (
      <PublicLayout>
        <div className="mx-auto flex min-h-[62dvh] max-w-xl items-center px-4 py-10 text-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-card dark:border-slate-700 dark:bg-slate-900/90 sm:p-10">
            <AlertCircle size={34} className="mx-auto text-amber-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">Item unavailable</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{error || 'This report may have been removed or is not public.'}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => void loadItem()} className="btn-primary inline-flex items-center justify-center gap-2"><RefreshCw size={16} aria-hidden="true" />Try again</button>
              <Link href="/items" className="btn-outline inline-flex items-center justify-center">Browse reports</Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const isFound = item.type === 'FOUND';
  const images = item.images ?? [];
  const currentImage = images[activeImage] ?? images[0];
  const hasLocation = Number.isFinite(item.locationLat) && Number.isFinite(item.locationLng);
  const ownerStatusActions: ItemStatus[] = ['ACTIVE', 'MATCHED'].includes(item.status) ? ['RETURNED', 'CLOSED'] : [];

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <Link href="/items" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-semibold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft size={17} aria-hidden="true" /> Back to community reports
        </Link>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-5">
            <section aria-label="Item photos" className="space-y-3">
              <div className="relative aspect-[4/3] max-h-[600px] min-h-72 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-card dark:border-slate-700 dark:bg-slate-800">
                {currentImage ? (
                  <Image src={currentImage.url} alt={`${item.title}, photo ${activeImage + 1} of ${images.length}`} fill priority sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover" />
                ) : (
                  <div className={cn('flex h-full min-h-72 flex-col items-center justify-center gap-3', item.type === 'LOST' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10')}>
                    <ImageIcon size={54} strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-sm font-semibold">No photo was added</span>
                  </div>
                )}
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-white shadow-sm', item.type === 'LOST' ? 'bg-red-500' : 'bg-emerald-600')}>
                    {item.type === 'LOST' ? <Search size={14} aria-hidden="true" /> : <Package size={14} aria-hidden="true" />}
                    {item.type === 'LOST' ? 'Lost' : 'Found'}
                  </span>
                  {!item.isApproved && <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-3 text-xs font-bold text-amber-800 shadow-sm dark:bg-amber-500/15 dark:text-amber-300">Awaiting review</span>}
                  {item.status !== 'ACTIVE' && <span className={cn('inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold shadow-sm', getStatusColor(item.status))}>{getStatusLabel(item.status)}</span>}
                </div>
                {images.length > 1 && <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{activeImage + 1} / {images.length}</span>}
              </div>

              {images.length > 1 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Choose item photo">
                  {images.map((image, index) => (
                    <button key={image.id} type="button" onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={activeImage === index} className={cn('relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 sm:size-20', activeImage === index ? 'border-primary-600 ring-2 ring-primary-100' : 'border-transparent opacity-75 hover:opacity-100')}>
                      <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {hasLocation && (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-labelledby="map-heading">
                <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
                  <div>
                    <h2 id="map-heading" className="text-sm font-bold text-slate-950 dark:text-white">{isOwner ? 'Exact report location' : 'Approximate public area'}</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{isOwner ? 'Only you and moderators can see the precise point.' : 'The exact point is softened to protect the finder and owner.'}</p>
                  </div>
                </div>
                <MapView lat={item.locationLat as number} lng={item.locationLng as number} label={item.locationLabel} precise={isOwner} />
              </section>
            )}

            <CommentSection itemId={item.id} />
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-card dark:border-slate-700 dark:bg-slate-900/95 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{item.category}</span>
                {item.subcategory && <><ChevronRight size={13} aria-hidden="true" /><span>{item.subcategory}</span></>}
              </div>
              <h1 className="mt-3 break-words font-display text-2xl font-extrabold leading-tight text-slate-950 dark:text-white sm:text-3xl">{item.title}</h1>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>

              <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Detail icon={MapPin} label="Area" value={item.locationArea || item.locationLabel} />
                <Detail icon={Calendar} label={item.type === 'LOST' ? 'Date lost' : 'Date found'} value={formatDate(item.dateLostFound)} />
                {item.color && <Detail icon={Palette} label="Color" value={item.color} />}
                {item.brand && <Detail icon={Tag} label="Brand" value={item.brand} />}
                {item.size && <Detail icon={Package} label="Size" value={item.size} />}
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="posted-by-heading">
              <h2 id="posted-by-heading" className="text-xs font-bold uppercase tracking-wide text-slate-400">Posted by</h2>
              <Link href={`/profile/${item.user?.id}`} className="group mt-3 flex min-h-12 items-center gap-3 rounded-2xl -m-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                {item.user?.avatarUrl ? <Image src={item.user.avatarUrl} alt="" width={44} height={44} className="size-11 rounded-full object-cover" /> : <span className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">{getAvatarFallback(item.user?.name)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-950 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">{item.user?.name || 'Community member'}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">Member since {formatDate(item.user?.createdAt, 'MMM yyyy')}</span>
                </span>
                <ChevronRight size={16} className="text-slate-300" aria-hidden="true" />
              </Link>
              {item.showContactInfo && item.user?.phone && (
                <a href={`tel:${item.user.phone}`} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"><Phone size={16} aria-hidden="true" />Call shared number</a>
              )}
            </section>

            {!isOwner ? (
              <section className="space-y-2" aria-label="Item actions">
                {isLoggedIn ? (
                  <>
                    {(!isFound || item.viewerHasClaim) && <button type="button" onClick={() => void handleStartChat()} disabled={action === 'chat'} className="btn-outline flex w-full items-center justify-center gap-2"><MessageSquare size={17} aria-hidden="true" />{action === 'chat' ? 'Opening chat…' : 'Message the poster'}</button>}
                    {isFound && item.viewerHasClaim && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200"><CheckCircle2 size={17} className="shrink-0" aria-hidden="true" />Claim submitted</span>
                        <Link href="/dashboard/claims" className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-500/10">View claims</Link>
                      </div>
                    )}
                    {isFound && !item.viewerHasClaim && ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'].includes(item.status) && <button type="button" onClick={() => setClaimOpen(true)} className="btn-primary flex w-full items-center justify-center gap-2"><CheckCircle2 size={17} aria-hidden="true" />Start ownership claim</button>}
                    <button type="button" onClick={() => setReportOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Flag size={14} aria-hidden="true" />Report a concern</button>
                  </>
                ) : (
                  <Link href={`/auth/login?next=${encodeURIComponent(`/items/${item.id}`)}`} className="btn-primary flex w-full items-center justify-center">Sign in to contact or claim</Link>
                )}
              </section>
            ) : (
              <section className="rounded-3xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-500/20 dark:bg-primary-500/10" aria-labelledby="manage-heading">
                <h2 id="manage-heading" className="text-sm font-bold text-primary-950 dark:text-primary-100">Manage your report</h2>
                <p className="mt-1 text-xs text-primary-800/75 dark:text-primary-200/75">Current status: {getStatusLabel(item.status)}</p>
                {ownerStatusActions.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ownerStatusActions.map((status) => (
                      <button key={status} type="button" onClick={() => void handleStatusUpdate(status)} disabled={action !== null} className="min-h-11 rounded-xl border border-primary-200 bg-white px-3 text-xs font-bold text-primary-800 hover:border-primary-400 dark:border-primary-500/20 dark:bg-slate-900 dark:text-primary-200">
                        {action === `status-${status}` ? 'Updating…' : status === 'RETURNED' ? 'Mark returned' : 'Close report'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={`/items/${item.id}/edit`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-primary-800 hover:bg-white dark:text-primary-200 dark:hover:bg-slate-900"><Pencil size={14} aria-hidden="true" />Edit</Link>
                  <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 size={14} aria-hidden="true" />Delete</button>
                </div>
              </section>
            )}

            {isFound && (
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <div><p className="text-xs font-bold text-amber-900 dark:text-amber-200">Ownership is verified privately</p><p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">Claim answers are shared only with the finder and moderators. Never send passwords or payment details.</p></div>
              </div>
            )}

            {isOwner && matches.length > 0 && (
              <section aria-labelledby="matches-heading">
                <h2 id="matches-heading" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><Star size={16} className="text-amber-500" aria-hidden="true" />Potential matches ({matches.length})</h2>
                <div className="space-y-3">{matches.slice(0, 3).map((match) => <MatchCard key={match.id} match={match} itemType={item.type} />)}</div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {claimOpen && <ClaimModal item={item} onClose={() => setClaimOpen(false)} onSuccess={() => { setClaimOpen(false); setItem((current) => current ? { ...current, status: 'CLAIM_PENDING', viewerHasClaim: true } : current); }} />}
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} itemId={item.id} />
      <ConfirmDeleteDialog open={deleteOpen} loading={action === 'delete'} itemTitle={item.title} onOpenChange={setDeleteOpen} onConfirm={() => void handleDelete()} />
    </PublicLayout>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-primary-500" aria-hidden="true" />
      <div className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</dd></div>
    </div>
  );
}

function ItemDetailSkeleton() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label="Loading item">
        <div className="skeleton mb-5 h-11 w-48 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
          <div className="space-y-4"><div className="skeleton aspect-[4/3] max-h-[600px] rounded-[2rem]" /><div className="skeleton h-56 rounded-3xl" /></div>
          <div className="space-y-4"><div className="skeleton h-80 rounded-3xl" /><div className="skeleton h-24 rounded-3xl" /><div className="skeleton h-28 rounded-3xl" /></div>
        </div>
      </div>
    </PublicLayout>
  );
}

function DialogFrame({ children, title, description, open, onOpenChange, loading = false }: Readonly<{ children: React.ReactNode; title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; loading?: boolean }>) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!loading) onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content onEscapeKeyDown={(event) => { if (loading) event.preventDefault(); }} className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-xl font-bold text-slate-950 dark:text-white">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" disabled={loading} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog"><X size={19} aria-hidden="true" /></button></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ReportDialog({ open, onOpenChange, itemId }: { open: boolean; onOpenChange: (open: boolean) => void; itemId: string }) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['value'] | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason) { setError('Choose the reason that best matches your concern.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/reports', { itemId, reason, description: description.trim() || undefined });
      toast({ title: 'Report submitted', description: 'A moderator will review this listing.' });
      setReason('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      setError(getErrorMessage(error, 'The report could not be submitted.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogFrame open={open} onOpenChange={onOpenChange} loading={loading} title="Report a concern" description="Reports are private and reviewed by a moderator.">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Reason</legend><div className="space-y-2">{REPORT_REASONS.map((entry) => <label key={entry.value} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-medium', reason === entry.value ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-500/10 dark:text-primary-100' : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300')}><input type="radio" name="report-reason" value={entry.value} checked={reason === entry.value} onChange={() => setReason(entry.value)} className="size-4 accent-primary-600" />{entry.label}</label>)}</div></fieldset>
        <div><label htmlFor="report-description" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Details <span className="font-normal text-slate-400">(optional)</span></label><textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} className="input-field resize-y" placeholder="Share only the context a moderator needs" /></div>
        {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</div>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Dialog.Close asChild><button type="button" disabled={loading} className="btn-outline">Cancel</button></Dialog.Close><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting…' : 'Submit report'}</button></div>
      </form>
    </DialogFrame>
  );
}

function ConfirmDeleteDialog({ open, loading, itemTitle, onOpenChange, onConfirm }: { open: boolean; loading: boolean; itemTitle: string; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <DialogFrame open={open} onOpenChange={onOpenChange} loading={loading} title="Remove this report?" description={`“${itemTitle}” will be removed from public view, matching, and new conversations.`}>
      <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-800 dark:bg-red-500/10 dark:text-red-200">The report photos and linked conversations are removed. Claim, comment, and moderation records may be retained for safety and audit purposes. This cannot be undone. If the item was returned, mark it returned instead so the community outcome is preserved.</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Dialog.Close asChild><button type="button" disabled={loading} className="btn-outline">Keep report</button></Dialog.Close><button type="button" onClick={onConfirm} disabled={loading} className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{loading ? 'Removing…' : 'Remove report'}</button></div>
    </DialogFrame>
  );
}
