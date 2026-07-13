'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, AlertCircle } from 'lucide-react';
import api, { ApiError } from '@/lib/api';

interface ClaimModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimModal({ item, onClose, onSuccess }: ClaimModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Generate verification questions based on item type/category
  const questions = [
    'What is the exact color and brand of this item?',
    'Describe any unique markings, stickers, or damage on this item.',
    'What was inside the item when you last had it? (e.g. wallet contents, bag contents)',
    'Where exactly did you last have this item?',
  ].slice(0, 3);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length || Object.values(answers).some(a => !a.trim())) {
      setError('Please answer all verification questions.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/claims', {
        itemId: item.id,
        verificationAnswers: answers,
        message: message.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-dialog-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-transparent dark:border-gray-800"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 z-10">
          <div>
            <h2 id="claim-dialog-title" className="font-display font-bold text-gray-900 dark:text-white">Claim This Item</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close claim dialog" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info box */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
            <Shield size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Ownership Verification Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                Answer the questions below to verify you're the rightful owner. Your answers will be reviewed by the finder.
              </p>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, i) => (
            <div key={i}>
              <label htmlFor={`claim-answer-${i}`} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {i + 1}. {q}
              </label>
              <textarea
                id={`claim-answer-${i}`}
                value={answers[`q${i}`] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [`q${i}`]: e.target.value }))}
                rows={2}
                maxLength={500}
                className="input-field resize-none"
                placeholder="Your answer..."
              />
            </div>
          ))}

          {/* Message */}
          <div>
            <label htmlFor="claim-message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Additional Message <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="claim-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="input-field resize-none"
              placeholder="Anything else you'd like the finder to know..."
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl text-sm">
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
