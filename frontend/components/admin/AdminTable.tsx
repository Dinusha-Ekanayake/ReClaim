import { cn } from '@/lib/utils';

interface AdminTableProps {
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
  colCount?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function AdminTable({
  headers,
  children,
  loading = false,
  colCount,
  emptyMessage = 'No records found',
  isEmpty = false,
}: AdminTableProps) {
  const cols = colCount || headers.length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map(h => (
              <th key={h}
                className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <tr key={i}>
                {[...Array(cols)].map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="skeleton h-4 rounded w-24" />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? null : children}
        </tbody>
      </table>

      {!loading && isEmpty && (
        <div className="text-center py-14 text-gray-500 text-sm">{emptyMessage}</div>
      )}
    </div>
  );
}

export function AdminTd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-5 py-4 text-sm text-gray-300', className)}>
      {children}
    </td>
  );
}
