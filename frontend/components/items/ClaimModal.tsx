'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldCheck, X } from 'lucide-react';
import api, { ApiError } from '@/lib/api';

interface ClaimModalProps {
  item: {
    id: string;
    title: string;
    verificationQuestions?: string[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

const FALLBACK_QUESTIONS = [
  'Describe a detail or marking that is not visible in the listing photos.',
  'Where and when did you last have this item?',
  'What else would help the finder confirm that this belongs to you?',
];

export default function ClaimModal({ item, onClose, onSuccess }: Readonly<ClaimModalProps>) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(() => {
    const configured = item.verificationQuestions?.map((question) => question.trim()).filter(Boolean);
    return configured?.length ? configured : FALLBACK_QUESTIONS;
  }, [item.verificationQuestions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const complete = questions.every((_, index) => answers[`q${index}`]?.trim());
    if (!complete) {
      setError('Please answer every ownership question.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/claims', {
        itemId: item.id,
        verificationAnswers: Object.fromEntries(
          questions.map((_, index) => [`q${index}`, answers[`q${index}`].trim()]),
        ),
        message: message.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The claim could not be submitted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild onEscapeKeyDown={(event) => { if (loading) event.preventDefault(); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,760px)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:p-6">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-xl font-bold text-slate-950 dark:text-white">
                  Verify your ownership
                </Dialog.Title>
                <Dialog.Description className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  Claiming “{item.title}”
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  aria-label="Close claim dialog"
                  className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <ShieldCheck size={21} className="mt-0.5 flex-shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Answers go only to the finder and moderators</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                    Do not post passwords, payment details, or identity-document numbers. Give only enough private detail to prove ownership.
                  </p>
                </div>
              </div>

              {questions.map((question, index) => {
                const id = `claim-answer-${index}`;
                return (
                  <div key={`${index}-${question}`}>
                    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {index + 1}. {question}
                    </label>
                    <textarea
                      id={id}
                      value={answers[`q${index}`] || ''}
                      onChange={(event) => setAnswers((current) => ({ ...current, [`q${index}`]: event.target.value }))}
                      rows={2}
                      maxLength={500}
                      required
                      className="input-field resize-none"
                      placeholder="Your private answer"
                    />
                  </div>
                );
              })}

              <div>
                <label htmlFor="claim-message" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Message <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="claim-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  maxLength={500}
                  className="input-field resize-none"
                  placeholder="Add safe handover context for the finder"
                />
              </div>

              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                >
                  <AlertCircle size={17} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <button type="button" disabled={loading} className="btn-outline sm:min-w-32">Cancel</button>
                </Dialog.Close>
                <button type="submit" disabled={loading} className="btn-primary sm:min-w-44">
                  {loading ? 'Submitting claim…' : 'Submit for review'}
                </button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
