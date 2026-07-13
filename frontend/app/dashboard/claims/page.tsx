'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, XCircle, Clock, Eye, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonList } from '@/components/shared/LoadingSpinner';
import { toast } from '@/components/ui/toaster';

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-green-100 dark:bg-emerald-500/15 text-green-700 dark:text-emerald-400',
  REJECTED: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  PENDING:  <Clock size={13} />,
  APPROVED: <CheckCircle size={13} />,
  REJECTED: <XCircle size={13} />,
};

export default function ClaimsPage() {
  const user = useAuthStore(s => s.user);

  // Claims I submitted on found items
  const [myClaims, setMyClaims]           = useState<any[]>([]);
  // Claims others submitted on my found items
  const [receivedClaims, setReceivedClaims] = useState<any[]>([]);
  const [tab, setTab]                     = useState<'submitted' | 'received'>('received');
  const [loading, setLoading]             = useState(true);
  const [processing, setProcessing]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/claims/my'),
      api.get('/claims/received', { limit: 50 }),
    ]).then(([submitted, received]: any[]) => {
      setMyClaims(submitted);
      setReceivedClaims(received.claims);
    }).catch((error) => {
      toast({ title: 'Could not load claims', description: error.message, variant: 'destructive' });
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const handleReview = async (claimId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(claimId);
    try {
      await api.patch(`/claims/${claimId}`, { status });
      setReceivedClaims(prev =>
        prev.map(c => c.id === claimId ? { ...c, status } : c)
      );
    } catch (error: any) {
      toast({ title: 'Could not review claim', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = receivedClaims.filter(c => c.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">Claims</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage ownership claims on found items</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['received', 'submitted'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === t ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600')}>
            {t === 'received' ? (
              <>Received {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingCount}</span>}</>
            ) : 'My Submissions'}
          </button>
        ))}
      </div>

      {/* Received claims */}
      {tab === 'received' && (
        loading ? <SkeletonList count={4} /> :
        receivedClaims.length === 0 ? (
          <EmptyState icon="📋" title="No claims yet"
            description="When someone claims one of your found items, it will appear here." />
        ) : (
          <div className="space-y-4">
            {receivedClaims.map(claim => (
              <div key={claim.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {claim.claimant?.avatarUrl ? (
                      <Image src={claim.claimant.avatarUrl} alt={claim.claimant.name}
                        width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center">
                        {claim.claimant?.name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{claim.claimant?.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{claim.claimant?.email}</p>
                    </div>
                  </div>
                  <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                    STATUS_STYLES[claim.status])}>
                    {STATUS_ICONS[claim.status]} {claim.status}
                  </span>
                </div>

                {/* Item context */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="text-lg">{claim.item?.type === 'FOUND' ? '📦' : '🔍'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{claim.item?.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{claim.item?.locationLabel}</p>
                  </div>
                  <Link href={`/items/${claim.item?.id}`}
                    className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0">
                    <Eye size={12} /> View
                  </Link>
                </div>

                {/* Verification answers */}
                {claim.item?.verificationHints?.length > 0 && (
                  <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Your private verification checklist</p>
                    <ul className="space-y-1 text-sm text-amber-900/80 dark:text-amber-200/80 list-disc pl-4">
                      {claim.item.verificationHints.map((hint: string) => <li key={hint}>{hint}</li>)}
                    </ul>
                  </div>
                )}
                {claim.verificationAnswers && Object.keys(claim.verificationAnswers).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Verification Answers</p>
                    <div className="space-y-2">
                      {Object.entries(claim.verificationAnswers).map(([key, answer], i) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Question {i + 1}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{answer as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                {claim.message && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-primary-500/10 rounded-xl">
                    <p className="text-xs font-semibold text-blue-700 dark:text-primary-300 mb-1">Message from claimant</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">"{claim.message}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(claim.createdAt)}</span>
                  {claim.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const chat = await api.post('/chats', { recipientId: claim.claimantId });
                          window.open(`/chat/${chat.id}`, '_blank');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <MessageSquare size={13} /> Chat
                      </button>
                      <button
                        onClick={() => handleReview(claim.id, 'REJECTED')}
                        disabled={processing === claim.id}
                        className="px-4 py-1.5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(claim.id, 'APPROVED')}
                        disabled={processing === claim.id}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-500 transition-colors disabled:opacity-50">
                        {processing === claim.id ? 'Processing…' : 'Approve ✓'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* My submitted claims */}
      {tab === 'submitted' && (
        loading ? <SkeletonList count={4} /> :
        myClaims.length === 0 ? (
          <EmptyState icon="📋" title="No claims submitted"
            description="Browse found items and submit a claim if something is yours."
            actionLabel="Browse Found Items" actionHref="/items?type=FOUND" />
        ) : (
          <div className="space-y-4">
            {myClaims.map((claim: any) => (
              <div key={claim.id} className="card p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {claim.item?.images?.[0]?.url
                    ? <Image src={claim.item.images[0].url} alt="" width={56} height={56} className="object-cover w-full h-full" />
                    : <span className="text-2xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{claim.item?.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(claim.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link href={`/items/${claim.item?.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    View item
                  </Link>
                  <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                    STATUS_STYLES[claim.status])}>
                    {STATUS_ICONS[claim.status]} {claim.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
