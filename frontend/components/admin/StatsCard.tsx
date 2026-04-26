import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconColor: string;
  href?: string;
  alert?: boolean;
}

export function StatsCard({ label, value, sub, icon, iconColor, href, alert }: StatsCardProps) {
  const content = (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconColor)}>
          {icon}
        </div>
        {alert && (
          <span className="text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-1 rounded-lg">
            Action needed
          </span>
        )}
      </div>
      <div className="text-3xl font-display font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
