'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Calendar, Tag, Palette, Package, User, MessageSquare,
  Flag, ArrowLeft, CheckCircle, Shield, Phone, ExternalLink, Star
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import CommentSection from '@/components/items/CommentSection';
import MatchCard from '@/components/items/MatchCard';
import ClaimModal from '@/components/items/ClaimModal';
import MapView from '@/components/items/MapView';
import api from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { cn, timeAgo, formatDate, getStatusColor, getStatusLabel, CATEGORIES } from '@/lib/utils';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useIsLoggedIn();

  const [item, setItem] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    api.get(`/items/${id}`).then(data => {
      setItem(data);
      setLoading(false);
    }).catch(() => router.push('/items'));
  }, [id]);

  useEffect(() => {
    if (item && user && item.userId === user.id) {
      api.get(`/matches/${id}`).then(setMatches).catch(() => {});
    }
  }, [item, user]);

  const handleStartChat = async () => {
    if (!isLoggedIn) return router.push('/auth/login');
    try {
      const chat = await api.post('/chats', { recipientId: item.userId, itemId: item.id });
      router.push(`/chat/${chat.id}`);
    } catch {}
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.patch(`/items/${id}/status`, { status });
      setItem((prev: any) => ({ ...prev, status }));
    } catch {}
  };

  const handleReport = async (reason: string) => {
    try {
      await api.post('/reports', { itemId: id, reason });
      setReportOpen(false);
    } catch {}
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="skeleton h-8 w-32 rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="skeleton h-96 rounded-2xl" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-4 rounded" />)}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!item) return null;

  const isOwner = user?.id === item.userId;
  const isFound = item.type === 'FOUND';
  const catIcon = CATEGORIES.find(c => c.value === item.category)?.icon || '📦';

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to items
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Images */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Image */}
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden h-80 sm:h-96 lg:h-[420px]">
              {item.images?.length > 0 ? (
                <Image src={item.images[activeImage]?.url} alt={item.title}
                  fill className="object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center text-8xl">{catIcon}</div>
              )}
              {/* Type badge */}
              <span className={cn(
                'absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold',
                item.type === 'LOST' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              )}>
                {item.type === 'LOST' ? '🔍 LOST' : '📦 FOUND'}
              </span>
              {/* Status */}
              {item.status !== 'ACTIVE' && (
                <span className={cn('absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-semibold',
                  getStatusColor(item.status))}>
                  {getStatusLabel(item.status)}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {item.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {item.images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => setActiveImage(i)}
                    className={cn('flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                      activeImage === i ? 'border-primary-500' : 'border-transparent')}>
                    <Image src={img.url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}

            {/* Map */}
            {item.locationLat && item.locationLng && (
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <MapView lat={item.locationLat} lng={item.locationLng} label={item.locationLabel} />
              </div>
            )}

            {/* Comments */}
            <CommentSection itemId={id} />
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title & meta */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{catIcon}</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                {item.subcategory && (
                  <span className="text-xs text-gray-400">/ {item.subcategory}</span>
                )}
              </div>
              <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">{item.title}</h1>
              <p className="text-gray-600 leading-relaxed text-sm">{item.description}</p>
            </div>

            {/* Details grid */}
            <div className="card p-5 space-y-3">
              {[
                { icon: <MapPin size={15} />, label: 'Location', value: item.locationLabel },
                { icon: <Calendar size={15} />, label: item.type === 'LOST' ? 'Date Lost' : 'Date Found', value: formatDate(item.dateLostFound) },
                item.color && { icon: <Palette size={15} />, label: 'Color', value: item.color },
                item.brand && { icon: <Tag size={15} />, label: 'Brand', value: item.brand },
                item.size && { icon: <Package size={15} />, label: 'Size', value: item.size },
              ].filter(Boolean).map((detail: any) => (
                <div key={detail.label} className="flex items-start gap-3">
                  <span className="text-gray-400 mt-0.5 flex-shrink-0">{detail.icon}</span>
                  <div>
                    <span className="text-xs text-gray-400 block">{detail.label}</span>
                    <span className="text-sm font-medium text-gray-900">{detail.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Posted by */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Posted by</h3>
              <Link href={`/profile/${item.user?.id}`} className="flex items-center gap-3 group">
                {item.user?.avatarUrl ? (
                  <Image src={item.user.avatarUrl} alt={item.user.name} width={40} height={40}
                    className="rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center">
                    {item.user?.name?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {item.user?.name}
                  </p>
                  <p className="text-xs text-gray-400">Member since {formatDate(item.user?.createdAt, 'MMM yyyy')}</p>
                </div>
              </Link>
              {item.showContactInfo && item.user?.phone && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <a href={`tel:${item.user.phone}`}
                    className="flex items-center gap-2 text-sm text-secondary-600 font-medium hover:underline">
                    <Phone size={14} /> {item.user.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!isOwner && isLoggedIn && (
                <>
                  <button onClick={handleStartChat}
                    className="w-full btn-outline flex items-center justify-center gap-2">
                    <MessageSquare size={16} /> Send Message
                  </button>
                  {isFound && item.status === 'ACTIVE' && (
                    <button onClick={() => setClaimOpen(true)}
                      className="w-full btn-primary flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> This is Mine — Claim It
                    </button>
                  )}
                </>
              )}
              {!isLoggedIn && (
                <Link href="/auth/login"
                  className="w-full btn-primary flex items-center justify-center gap-2">
                  Sign in to interact
                </Link>
              )}

              {/* Owner controls */}
              {isOwner && (
                <div className="card p-4 space-y-2 bg-blue-50 border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Your Item — Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['ACTIVE', 'RETURNED', 'CLOSED'].map(s => (
                      <button key={s} onClick={() => handleStatusUpdate(s)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                          item.status === s
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400')}>
                        {getStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                  <Link href={`/items/${id}/edit`}
                    className="block text-center text-xs text-primary-600 hover:underline mt-2">
                    Edit Item Details
                  </Link>
                </div>
              )}

              {!isOwner && isLoggedIn && (
                <button onClick={() => setReportOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-2">
                  <Flag size={13} /> Report this item
                </button>
              )}
            </div>

            {/* Verification notice */}
            {isFound && (
              <div className="card p-4 bg-amber-50 border-amber-100">
                <div className="flex items-start gap-2">
                  <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Ownership Verification</p>
                    <p className="text-xs text-amber-700 mt-1">
                      To claim this item, you'll need to answer verification questions to prove it's yours. Some item details are hidden to protect the real owner.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Matches (owner only) */}
            {isOwner && matches.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" />
                  Potential Matches ({matches.length})
                </h3>
                <div className="space-y-3">
                  {matches.slice(0, 3).map((match: any) => (
                    <MatchCard key={match.id} match={match} itemType={item.type} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {claimOpen && (
        <ClaimModal item={item} onClose={() => setClaimOpen(false)}
          onSuccess={() => { setClaimOpen(false); setItem((p: any) => ({ ...p, status: 'CLAIM_PENDING' })); }} />
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-display font-bold text-gray-900 mb-4">Report Item</h3>
            <div className="space-y-2">
              {['FAKE', 'INAPPROPRIATE', 'SPAM', 'WRONG_CATEGORY', 'OTHER'].map(reason => (
                <button key={reason} onClick={() => handleReport(reason)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 text-sm transition-all">
                  {reason.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setReportOpen(false)}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
