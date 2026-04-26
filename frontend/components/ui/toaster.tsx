'use client';
import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn('fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px]', className)}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: 'default' | 'destructive' }
>(({ className, variant = 'default', ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-5 shadow-lg transition-all',
      variant === 'destructive' ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-100 bg-white text-gray-900',
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn('absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100', className)}
    toast-close=""
    {...props}
  >
    <X size={14} />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// Simple Toaster
let toastFn: ((opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void) | null = null;

export function Toaster() {
  const [toasts, setToasts] = React.useState<Array<{
    id: string; title: string; description?: string; variant?: 'default' | 'destructive'; open: boolean;
  }>>([]);

  React.useEffect(() => {
    toastFn = ({ title, description, variant = 'default' }) => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, title, description, variant, open: true }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { toastFn = null; };
  }, []);

  return (
    <ToastProvider>
      {toasts.map(toast => (
        <Toast key={toast.id} open={toast.open} variant={toast.variant}>
          <div>
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export function toast(opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) {
  if (toastFn) toastFn(opts);
}
