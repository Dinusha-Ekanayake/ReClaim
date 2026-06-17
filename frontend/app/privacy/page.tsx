import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy Policy' };

const LAST_UPDATED = 'May 13, 2026';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-10">
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mb-2">Legal</p>
          <h1 className="text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-3">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
            <p>When you use ReClaim, we collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account information: name, email address, password (hashed)</li>
              <li>Item reports: title, description, photos, category, location, date</li>
              <li>Communication: messages sent through the in-app chat</li>
              <li>Optional: phone number, bio, profile photo</li>
            </ul>
            <p className="mt-3">We also collect technical data automatically: IP address, browser type, pages visited, and usage patterns to improve the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To operate and improve the ReClaim platform</li>
              <li>To match lost and found items using our algorithm</li>
              <li>To send notifications about matches, claims, and messages</li>
              <li>To prevent fraud, abuse, and violations of our Terms</li>
              <li>To respond to your support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">3. Information Sharing</h2>
            <p>We do <strong>not</strong> sell your personal information. We may share it with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Service providers:</strong> Cloudinary (image hosting), Supabase (database), Vercel/Render (hosting)</li>
              <li><strong>Other users:</strong> Your name, avatar, and items you post are visible to other users. Your phone number is only shared if you enable "Show phone number" in Settings.</li>
              <li><strong>Law enforcement:</strong> When required by law or to protect safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">4. Data Security</h2>
            <p>We use industry-standard security measures including bcrypt password hashing, JWT authentication with short-lived tokens, HTTPS encryption, and regular security reviews. No system is 100% secure; please use a strong, unique password.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">5. Your Rights</h2>
            <p>You may at any time:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Update your profile information in <Link href="/dashboard/settings" className="text-primary-600 hover:underline">Settings</Link></li>
              <li>Delete your items from your dashboard</li>
              <li>Request account deletion by emailing <a href="mailto:privacy@reclaim.app" className="text-primary-600 hover:underline">privacy@reclaim.app</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">6. Cookies</h2>
            <p>ReClaim uses local storage (not cookies) to store your authentication token on your device. No third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">7. Contact</h2>
            <p>Questions about this policy? Contact us at <a href="mailto:privacy@reclaim.app" className="text-primary-600 hover:underline">privacy@reclaim.app</a> or visit our <Link href="/contact" className="text-primary-600 hover:underline">Contact page</Link>.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
