'use client';
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Shared easing / variants ─────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

// Stagger container — children with `variants={fadeUp}` will cascade
export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

// ─── Reveal: animates into view once on scroll ────────────────────────────────
interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
}

export function Reveal({
  children, className, delay = 0, y = 24, once = true, amount = 0.2, ...rest
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger group + item helpers ─────────────────────────────────────────────
export function StaggerGroup({
  children, className, stagger = 0.08, delayChildren = 0, amount = 0.15, once = true, ...rest
}: HTMLMotionProps<'div'> & { stagger?: number; delayChildren?: number; amount?: number; once?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUp} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

// ─── MotionCard: hover-lift interactive card ──────────────────────────────────
export function MotionCard({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.25, ease: EASE } }}
      whileTap={{ scale: 0.98 }}
      className={cn('will-change-transform', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion };
