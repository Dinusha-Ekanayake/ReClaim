import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';

export const metadata: Metadata = { title: 'FAQ — Frequently Asked Questions' };

const FAQS = [
  {
    q: 'Is ReClaim free to use?',
    a: 'Yes. ReClaim is completely free for all users — posting items, claiming, chatting, and all features.',
  },
  {
    q: 'How does the AI matching work?',
    a: 'When you post an item, ReClaim scores it against all active counterpart items using a weighted algorithm: category (25%), keyword similarity (25%), GPS proximity (20%), date closeness (15%), colour/brand (10%), and AI text embeddings (5%). Matches scoring above 60% trigger an automatic notification.',
  },
  {
    q: 'What are verification hints?',
    a: "When you post a found item, you can add 1–3 hidden hints — details only the true owner would know (e.g. a scratch on the back, contents of a wallet). Claimants must answer these correctly before you approve the claim, preventing fraud.",
  },
  {
    q: 'How do I claim a found item?',
    a: "Open the item's detail page and click \"Claim this item\". You'll be asked to answer the finder's verification questions and optionally include a message. The finder reviews your answers and approves or rejects your claim.",
  },
  {
    q: 'Can I browse items without an account?',
    a: 'Yes. You can browse and search all public items without signing in. An account is required to post items, send messages, or submit claims.',
  },
  {
    q: 'How do I mark my item as returned?',
    a: 'Once a claim is approved, your item is automatically marked as "Returned". You can also manually change the status from your Dashboard → My Items.',
  },
  {
    q: 'What happens if someone files a fake claim?',
    a: "The verification question system prevents most fake claims. If you suspect fraud, reject the claim and use the \"Report\" button on the user's profile. Admins review all reports.",
  },
  {
    q: 'Is my phone number visible to others?',
    a: 'No. Your phone number is private by default. You can choose to show it in your Settings → Privacy, in which case it will appear on your item detail pages.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email us at support@reclaim.app with "Account deletion request" in the subject. We will delete your data within 7 business days.',
  },
  {
    q: 'The map is not showing for my item. Why?',
    a: "The map requires GPS coordinates. When posting an item, make sure to allow location access or manually enter coordinates. If you only enter a text address, the map will not display.",
  },
];

export default function FaqPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3">Help Centre</p>
          <h1 className="text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-500 dark:text-gray-400">Can't find your answer? <Link href="/contact" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Contact us</Link></p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <details key={i}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden
                         hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer
                                  font-semibold text-gray-900 dark:text-white list-none select-none">
                {faq.q}
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0
                                  text-gray-500 dark:text-gray-400 group-open:rotate-45 transition-transform duration-200 text-lg font-light">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-50 dark:border-gray-800 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-14 text-center p-8 bg-primary-50 dark:bg-primary-500/10 rounded-2xl border border-primary-100 dark:border-primary-500/20">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">Still have questions?</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Our team is happy to help you.</p>
          <Link href="/contact" className="btn-primary inline-flex">Get in touch</Link>
        </div>
      </div>
    </PublicLayout>
  );
}
