'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ExternalLink, Trash2, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn, timeAgo, getStatusColor, getStatusLabel } from '@/lib/utils';

export default function AdminItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [approvedFilter, setApprovedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/items', {
        search, page, limit: 20,
        ...(typeFilter && { type: typeFilter }),
        ...(approvedFilter !== '' && { approved: approvedFilter }),
      });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [search, typeFilter, approvedFilter, page]);

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await api.patch(`/admin/items/${id}/approve`, { isApproved: approved });
      setItems(prev => prev.map(i => i.id === id ? { ...i, isApproved: approved } : i));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      setDeleteId(null);
    } catch {}
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Item Management</h1>
        <p className="text-gray-400 text-sm">{total} total items</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search items..."
            className="bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 w-64" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500">
          <option value="">All Types</option>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </select>
        <select value={approvedFilter} onChange={e => { setApprovedFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500">
          <option value="">All Status</option>
          <option value="true">Approved</option>
          <option value="false">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {['Item', 'Type', 'Posted By', 'Status', 'Reports', 'Approved', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="skeleton h-4 rounded w-20" /></td>
                  ))}
                </tr>
              ))
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      {item.images?.[0]?.url ? (
                        <Image src={item.images[0].url} alt={item.title} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {item.type === 'LOST' ? '🔍' : '📦'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-[180px]">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.category} · {timeAgo(item.createdAt)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={cn('px-2 py-1 rounded-lg text-xs font-bold',
                    item.type === 'LOST' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')}>
                    {item.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div>
                    <p className="text-sm text-white">{item.user?.name}</p>
                    <p className="text-xs text-gray-500">{item.user?.email}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={cn('px-2 py-1 rounded-lg text-xs font-semibold', getStatusColor(item.status))}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {item._count?.reports > 0 ? (
                    <span className="text-red-400 text-sm font-bold">{item._count.reports}</span>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {item.isApproved ? (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs font-semibold">
                      <CheckCircle size={12} /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold">
                      <XCircle size={12} /> No
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/items/${item.id}`} target="_blank"
                      className="p-1.5 text-gray-500 hover:text-white transition-colors">
                      <ExternalLink size={15} />
                    </Link>
                    <button onClick={() => handleApprove(item.id, !item.isApproved)}
                      className={cn('p-1.5 transition-colors',
                        item.isApproved ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-green-400')}>
                      {item.isApproved ? <XCircle size={15} /> : <CheckCircle size={15} />}
                    </button>
                    <button onClick={() => setDeleteId(item.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-gray-500">No items found</div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">
            Next
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="font-display font-bold text-white mb-2">Delete Item?</h3>
            <p className="text-sm text-gray-400 mb-6">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
