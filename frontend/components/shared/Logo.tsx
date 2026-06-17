import Link from 'next/link';
import Image from 'next/image';
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
    <div className={cn('flex-shrink-0', s.box, className)}>
      <Image src="/logo.svg" alt="ReClaim" width={80} height={80} className="w-full h-full" priority />
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
