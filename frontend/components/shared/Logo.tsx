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
      <Image src="/favicon.png" alt="" width={80} height={80} className="w-full h-full object-contain" priority />
    </div>
  );
}

export default function Logo({ size = 'md', href = '/', className, showText = true }: LogoProps) {
  const inner = (
    <div className={cn('flex items-center gap-2.5 group', className)}>
      {showText ? (
        <Image src="/logo.png" alt="ReClaim — Find what matters. Return what's lost." width={180} height={180}
          className={cn('h-auto object-contain', size === 'sm' ? 'w-28' : size === 'md' ? 'w-32' : size === 'lg' ? 'w-40' : 'w-48')} priority />
      ) : <LogoIcon size={size} className="group-hover:scale-105 transition-transform duration-200" />}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
