import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  className?: string;
  showText?: boolean;
  textColor?: string;
}

const SIZES = {
  sm:  { box: 'w-8 h-8 rounded-xl text-base',  text: 'text-lg'  },
  md:  { box: 'w-10 h-10 rounded-xl text-lg',  text: 'text-xl'  },
  lg:  { box: 'w-14 h-14 rounded-2xl text-2xl', text: 'text-3xl' },
  xl:  { box: 'w-20 h-20 rounded-3xl text-3xl', text: 'text-4xl' },
};

export function LogoIcon({ size = 'md', className }: { size?: LogoProps['size']; className?: string }) {
  const s = SIZES[size ?? 'md'];
  return (
    <div className={cn(
      'flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm flex-shrink-0',
      s.box, className
    )}>
      <svg viewBox="0 0 24 24" fill="none" className="w-[55%] h-[55%]">
        <path d="M5 12a7 7 0 1 1 7 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M12 19 L9 15.5 L15 15.5 Z" fill="white"/>
      </svg>
    </div>
  );
}

export default function Logo({ size = 'md', href = '/', className, showText = true, textColor }: LogoProps) {
  const s = SIZES[size];

  const inner = (
    <div className={cn('flex items-center gap-2.5 group', className)}>
      <LogoIcon size={size} className="group-hover:scale-105 transition-transform duration-200" />
      {showText && (
        <span className={cn('font-display font-extrabold tracking-tight', s.text, textColor ?? 'text-gray-900')}>
          Re<span className="text-primary-600">Claim</span>
        </span>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
