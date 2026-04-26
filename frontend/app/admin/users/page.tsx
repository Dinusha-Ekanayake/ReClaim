'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search, Ban, CheckCircle, Shield, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionUser, setActionUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/users', { search, page, limit: 20 });
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, page]);

  const handleBanToggle = async (user: any) => {
    setProcessing(true);
    try {
      const updated = await api.patch(`/admin/users/${user.id}/ban`, {
        isBanned: !user.isBanned,
        banReason: !user.isBanned ? (banReason || 'Banned by admin') : null,
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      setActionUser(null);
      setBanReason('');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const updated = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
    } catch {}
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">User Management</h1>
        <p className="text-gray-400 text-sm">{total} total users</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {['User', 'Role', 'Items', 'Joined', 'Status', 'Actions'].map(h => (
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
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="skeleton h-4 rounded w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.name} width={36} height={36} className="rounded-full" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-700 text-gray-300 text-sm font-bold flex items-center justify-center">
                        {getAvatarFallback(user.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <select value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={user.role === 'SUPER_ADMIN'}
                    className={cn('bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-primary-500',
                      user.role === 'SUPER_ADMIN' ? 'text-amber-400' :
                      user.role === 'ADMIN' ? 'text-blue-400' : 'text-gray-400')}>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    {user.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                  </select>
                </td>
                <td className="px-5 py-4 text-sm text-gray-400">{user._count?.items ?? 0}</td>
                <td className="px-5 py-4 text-xs text-gray-500">{timeAgo(user.createdAt)}</td>
                <td className="px-5 py-4">
                  {user.isBanned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold">
                      <Ban size={12} /> Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-semibold">
                      <CheckCircle size={12} /> Active
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {user.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => setActionUser(user)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        user.isBanned
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20')}>
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="text-center py-12 text-gray-500">No users found</div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
            Next
          </button>
        </div>
      )}

      {/* Ban Modal */}
      {actionUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 animate-fade-in">
            <h3 className="font-display font-bold text-white mb-2">
              {actionUser.isBanned ? 'Unban User' : 'Ban User'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {actionUser.isBanned
                ? `Remove ban from ${actionUser.name}?`
                : `Banning ${actionUser.name} will prevent them from logging in.`}
            </p>
            {!actionUser.isBanned && (
              <textarea value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="Reason for ban (optional)"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none mb-4" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setActionUser(null)}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleBanToggle(actionUser)} disabled={processing}
                className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60',
                  actionUser.isBanned
                    ? 'bg-green-600 text-white hover:bg-green-500'
                    : 'bg-red-600 text-white hover:bg-red-500')}>
                {processing ? 'Processing...' : actionUser.isBanned ? 'Unban' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
