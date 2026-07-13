import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  className?: string;
  showText?: boolean;
}

const SIZES = {
  sm: { icon: 'h-8 w-8 rounded-xl', logo: 'w-20' },
  md: { icon: 'h-10 w-10 rounded-xl', logo: 'w-24' },
  lg: { icon: 'h-14 w-14 rounded-2xl', logo: 'w-32' },
  xl: { icon: 'h-20 w-20 rounded-3xl', logo: 'w-40' },
};

export function LogoIcon({ size = 'md', className }: { size?: LogoProps['size']; className?: string }) {
  const classes = SIZES[size ?? 'md'].icon;
  return (
    <span className={cn('relative block flex-shrink-0 overflow-hidden', classes, className)} aria-hidden="true">
      <Image
        src="/favicon.png"
        alt=""
        fill
        sizes="80px"
        className="object-contain"
        priority
      />
    </span>
  );
}

export default function Logo({ size = 'md', href = '/', className, showText = true }: LogoProps) {
  const content = showText ? (
    <Image
      src="/logo.png"
      alt="ReClaim"
      width={1250}
      height={1250}
      sizes="160px"
      className={cn('h-auto rounded-2xl bg-white object-contain', SIZES[size].logo)}
      priority
    />
  ) : (
    <LogoIcon size={size} />
  );

  const inner = <span className={cn('inline-flex items-center', className)}>{content}</span>;

  return href ? (
    <Link href={href} aria-label="ReClaim home" className="inline-flex rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950">
      {inner}
    </Link>
  ) : inner;
}
