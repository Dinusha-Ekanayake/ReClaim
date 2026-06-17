'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render the real icon after mount
  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400',
        'hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
        'transition-all duration-200 overflow-hidden',
        className
      )}
    >
      <span className="block w-5 h-5">
        {mounted && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ y: -16, opacity: 0, rotate: -90 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 16, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isDark ? <Moon size={19} /> : <Sun size={19} />}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
    </button>
  );
}
