'use client';
import { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-display font-bold text-gray-900">Claim This Item</h2>
            <p className="text-sm text-gray-500">{item.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info box */}
          <div className="flex gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Ownership Verification Required</p>
              <p className="text-xs text-amber-700 mt-1">
                Answer the questions below to verify you're the rightful owner. Your answers will be reviewed by the finder.
              </p>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, i) => (
            <div key={i}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {i + 1}. {q}
              </label>
              <textarea
                value={answers[`q${i}`] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [`q${i}`]: e.target.value }))}
                rows={2}
                className="input-field resize-none"
                placeholder="Your answer..."
              />
            </div>
          ))}

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Anything else you'd like the finder to know..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}
