import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-10">
          <p className="text-sm text-gray-400 font-medium mb-2">Legal</p>
          <h1 className="text-4xl font-display font-extrabold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500">Last updated: May 13, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ReClaim, you agree to be bound by these Terms of Service and our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>. If you do not agree, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use ReClaim. By using the service, you confirm you meet this requirement.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post only accurate, truthful information about lost or found items</li>
              <li>Do not post spam, misleading, or fraudulent content</li>
              <li>Do not use ReClaim to harass, threaten, or harm others</li>
              <li>Respect other users' privacy — do not share their contact details without consent</li>
              <li>Do not attempt to bypass security measures or the verification system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">4. Content Ownership</h2>
            <p>You retain ownership of content you post (photos, descriptions). By posting, you grant ReClaim a non-exclusive, royalty-free licence to display and distribute that content for the purpose of operating the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">5. Prohibited Activities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Filing false claims for items you do not own</li>
              <li>Impersonating another person or entity</li>
              <li>Using the platform for commercial solicitation</li>
              <li>Attempting to reverse-engineer or scrape the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">6. Disclaimer of Warranties</h2>
            <p>ReClaim is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that items reported will be found or returned. We are a facilitating platform, not a guarantor of outcomes.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>ReClaim shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to loss of property or failed item reunions.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">8. Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting <a href="mailto:support@reclaim.app" className="text-primary-600 hover:underline">support@reclaim.app</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">9. Changes to Terms</h2>
            <p>We may update these Terms periodically. Continued use after changes constitutes acceptance. Material changes will be communicated via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">10. Contact</h2>
            <p>For questions, contact us at <a href="mailto:legal@reclaim.app" className="text-primary-600 hover:underline">legal@reclaim.app</a>.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
