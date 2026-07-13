import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, CircleHelp, MessageSquareText } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';

export const metadata: Metadata = { title: 'Frequently Asked Questions' };

const FAQS = [
  {
    question: 'Is ReClaim free to use?',
    answer: 'Yes. ReClaim currently has no payment step for creating an account, posting a report, submitting a claim, or using chat.',
  },
  {
    question: 'How does item matching work?',
    answer: 'ReClaim compares active lost and found reports in the same category. The score uses category (25%), keywords (25%), location (20%), date (15%), colour and brand (10%), and text embeddings when available (5%). Suggestions scoring at least 30% can be retained, and matches scoring 60% or more trigger notifications. A score is a lead, not proof of ownership.',
  },
  {
    question: 'How do ownership questions protect a found item?',
    answer: 'A found-item report includes one to five ownership questions. The questions are prompts, not hidden correct answers stored by ReClaim. A claimant writes an answer to every question, and those answers are shared with the finder for a human decision. Avoid putting the expected answer in the public description or photos.',
  },
  {
    question: 'How do I claim a found item?',
    answer: 'Open an available found-item report, choose “Claim this item,” answer every ownership question, and optionally add a message. You must be signed in, and you cannot claim your own report. The finder reviews the written answers and approves or rejects the claim.',
  },
  {
    question: 'Can I browse without an account?',
    answer: 'Yes. Public, approved reports can be browsed and searched without signing in. An account is required to post, comment, claim, report a concern, or use chat.',
  },
  {
    question: 'When is an item marked as returned?',
    answer: 'Approving a claim marks that item as returned automatically. An owner can also close or mark an active or matched report as returned from their dashboard. A report with a pending claim must be reviewed first, and completed reports cannot be reopened by the owner.',
  },
  {
    question: 'How do I report a suspicious or inappropriate listing?',
    answer: 'While signed in, open the item and choose “Report a concern.” Select the reason and add relevant context. The report enters the administrator moderation queue for review; submitting a report does not automatically remove the item or prove a violation.',
  },
  {
    question: 'When is my phone number shown?',
    answer: 'A phone number is public on an item only when both controls are enabled: “Show phone on listings” in Dashboard Settings and the contact-sharing option on that specific report. Otherwise, public viewers do not receive it. The report owner and administrators can still access the report-management view.',
  },
  {
    question: 'How do I permanently delete my account?',
    answer: 'Go to Dashboard → Settings, find “Delete account,” and confirm with your current password and the word DELETE. This permanently removes the account and associated user-owned data and cannot be undone.',
  },
  {
    question: 'Why does the public map show an area instead of an exact pin?',
    answer: 'On an item detail page, public viewers receive an approximate location: the area label is preferred, coordinates are rounded to two decimal places, and the map shows an area circle rather than an exact marker. Owner and administrator views can receive the precise saved location. If no coordinates were saved, no map is shown.',
  },
] as const;

export default function FaqPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <header className="grid gap-5 border-b border-slate-200 pb-8 dark:border-slate-800 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary-50 px-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              <CircleHelp size={14} aria-hidden="true" />
              Help centre
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Clear answers, based on how ReClaim works.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Matching, privacy, claiming, moderation, and account controls in plain language.
            </p>
          </div>
          <Link href="/contact" className="btn-outline inline-flex w-fit items-center gap-2">
            Ask another question <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <section className="mt-6 space-y-2" aria-label="Frequently asked questions">
          {FAQS.map((faq, index) => (
            <details
              key={faq.question}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white open:border-primary-200 open:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:open:border-primary-500/30"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-sm font-bold text-slate-900 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:text-white sm:px-5">
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 font-mono text-[11px] font-bold text-slate-300 dark:text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  <span>{faq.question}</span>
                </span>
                <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-slate-100 px-4 py-4 pl-12 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:px-5 sm:pl-[3.75rem]">
                {faq.answer}
              </div>
            </details>
          ))}
        </section>

        <aside className="mt-6 flex flex-col gap-4 rounded-3xl bg-primary-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between" aria-labelledby="faq-contact-title">
          <div className="flex items-start gap-3">
            <MessageSquareText size={22} className="mt-0.5 shrink-0 text-primary-100" aria-hidden="true" />
            <div>
              <h2 id="faq-contact-title" className="font-display text-lg font-bold">Need help with a specific situation?</h2>
              <p className="mt-1 text-sm leading-relaxed text-primary-100">Send the support team the relevant report title and a clear description of what happened.</p>
            </div>
          </div>
          <Link href="/contact" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-primary-800 hover:bg-primary-50">
            Contact support
          </Link>
        </aside>
      </div>
    </PublicLayout>
  );
}
