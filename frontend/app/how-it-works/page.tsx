import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Flag,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';

const STEPS = [
  {
    icon: Search,
    title: 'Create a useful report',
    description: 'Choose lost or found, add an accurate description and date, then include photos when they help identify the item.',
    points: ['A public area helps people search', 'An optional precise point improves private matching', 'Found reports include ownership questions'],
  },
  {
    icon: WandSparkles,
    title: 'Review potential matches',
    description: 'ReClaim compares active counterpart reports using category, words, date, attributes, optional location, and semantic similarity when configured.',
    points: ['Scores of 30 or more are retained as suggestions', 'Scores of 60 or more trigger match notifications', 'Suggestions are evidence, not proof of ownership'],
  },
  {
    icon: ShieldCheck,
    title: 'Verify ownership privately',
    description: 'For found items, a claimant answers the finder’s questions. Answers are visible to the finder and moderators, never on the public listing.',
    points: ['Ask about a non-public marking or detail', 'Never request passwords or payment information', 'The finder can approve or reject the claim'],
  },
  {
    icon: MessageSquare,
    title: 'Coordinate a safe handover',
    description: 'Use the item-linked ReClaim chat to agree on a safe public meeting point. A phone number appears only when both profile and report settings allow it.',
    points: ['Chat keeps the item context attached', 'Failed messages can be retried without duplicate sends', 'Report suspicious content for moderator review'],
  },
  {
    icon: CheckCircle2,
    title: 'Record the outcome',
    description: 'An approved claim marks the found report returned. Owners of active or matched reports can also close them or mark them returned.',
    points: ['Pending claims must be reviewed first', 'Returned and closed states are final', 'Real outcomes power the public impact totals'],
  },
] as const;

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      <section className="border-b border-slate-100 bg-gradient-to-br from-primary-50/90 via-white to-secondary-50/70 py-14 dark:border-slate-800 dark:from-primary-950/30 dark:via-slate-950 dark:to-secondary-950/20 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="section-pill"><Sparkles size={13} aria-hidden="true" />From report to return</p>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">How ReClaim works</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">A clear community workflow that separates useful public discovery from private ownership verification.</p>
        </div>
      </section>

      <section className="bg-white/90 py-14 dark:bg-slate-950/90 sm:py-16" aria-label="ReClaim process">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ol className="grid gap-5 lg:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, description, points }, index) => (
              <li key={title} className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${index === STEPS.length - 1 ? 'lg:col-span-2' : ''}`}>
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"><Icon size={22} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2><span className="font-mono text-xs font-bold text-slate-300 dark:text-slate-600">0{index + 1}</span></div><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p><ul className={`mt-4 grid gap-2 text-xs text-slate-500 dark:text-slate-400 ${index === STEPS.length - 1 ? 'sm:grid-cols-3' : ''}`}>{points.map((point) => <li key={point} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-secondary-500" aria-hidden="true" /><span>{point}</span></li>)}</ul></div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-50/80 py-14 dark:bg-slate-900/65 sm:py-16" aria-labelledby="safety-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl"><h2 id="safety-heading" className="font-display text-3xl font-extrabold text-slate-950 dark:text-white">Safety and privacy by design</h2><p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">ReClaim reduces unnecessary exposure, but users should still choose safe handover locations and trust verified details—not pressure or payment requests.</p></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: EyeOff, title: 'Approximate public maps', text: 'Visitors see a softened area; the owner and moderators can see the precise report point.' },
              { icon: ShieldCheck, title: 'Private claim answers', text: 'Ownership answers are restricted to the finder and moderators.' },
              { icon: Flag, title: 'Moderation tools', text: 'Item concerns, claims, and user activity can be reviewed by authorized moderators.' },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Icon size={21} className="text-primary-600 dark:text-primary-300" aria-hidden="true" /><h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 dark:bg-slate-950 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col gap-6 rounded-[2rem] bg-primary-700 p-6 text-white sm:p-9 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-xl"><PackageCheck size={28} aria-hidden="true" /><h2 className="mt-4 font-display text-3xl font-extrabold">Help the next item get home</h2><p className="mt-2 text-sm leading-relaxed text-primary-100">Browse the live board or add an accurate community report.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:shrink-0"><Link href="/items/new" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-primary-800 hover:bg-primary-50">Post a report</Link><Link href="/items" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/20">Browse reports<ArrowRight size={16} aria-hidden="true" /></Link></div></div></div>
      </section>
    </PublicLayout>
  );
}
