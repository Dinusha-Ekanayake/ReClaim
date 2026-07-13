import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy Policy' };

const LAST_UPDATED = 'July 13, 2026';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
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
              <li>Item reports: title, description, photos, category, public area, optional precise location, and date</li>
              <li>Communication: messages, comments, claims, and private ownership-verification answers</li>
              <li>Support and moderation information: contact-form messages, reports, and review records</li>
              <li>Optional profile information: phone number, bio, profile location, and profile photo</li>
            </ul>
            <p className="mt-3">Our hosting and API logs may record technical data such as IP address, user agent, request path, status code, and time. We use this data to operate, secure, and diagnose the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To operate and improve the ReClaim platform</li>
              <li>To compare lost and found reports using text, category, date, and optional location signals</li>
              <li>To send notifications about matches, claims, and messages</li>
              <li>To prevent fraud, abuse, and violations of our Terms</li>
              <li>To respond to your support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">3. Information Sharing</h2>
            <p>We do <strong>not</strong> sell your personal information. We may share it with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Application providers:</strong> Cloudinary (images), Supabase (database), Vercel and Render (hosting), Resend (email verification and password-reset messages when configured), and OpenAI (item-text embeddings when configured)</li>
              <li><strong>Browser-delivered resources:</strong> Google Fonts supplies the site fonts, and the OpenStreetMap Foundation supplies map tiles. Your browser connects directly to those services when the relevant resource is displayed.</li>
              <li><strong>Other users:</strong> Your name, avatar, bio, profile location, public report area, and approved reports are public. Ownership questions are visible, but submitted claim answers are restricted to the relevant authenticated claim workflow. A phone number appears only when both your profile setting and that specific report allow it.</li>
              <li><strong>Law enforcement:</strong> When required by law or to protect safety</li>
            </ul>
            <p className="mt-3">Google states that a Google Fonts request includes the visitor&apos;s IP address, requested resource URL, and HTTP headers such as browser information and referrer. See the <a href="https://fonts.google.com/faq?hl=en#privacy" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Google Fonts privacy information</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">4. Location and Map Requests</h2>
            <p>Providing precise coordinates is optional. When you use the map picker, your browser controls any device-location permission; ReClaim receives the selected coordinates when you include them in a report.</p>
            <p className="mt-3">Maps use tiles requested directly from <code>tile.openstreetmap.org</code>. The tile coordinates identify the map viewport, so OpenStreetMap can infer the approximate area being viewed. On the report editor or an owner/administrator detail view, that viewport may be centred on the precise point you selected. Public item-detail responses use a softened area and rounded coordinates, but this public softening does not apply to the precise editor or owner view.</p>
            <p className="mt-3">OpenStreetMap also receives normal connection information such as IP address, browser/device information, referrer, and request time under the <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">OpenStreetMap Foundation Privacy Policy</a>. Do not select a private home entrance or another confidential point when a broader safe meeting area is sufficient.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">5. Data Security</h2>
            <p>Security measures include bcrypt password hashing, short-lived signed access tokens, rotating refresh tokens stored as database digests, HTTP-only session cookies, request validation, and HTTPS in production. No system is completely secure; use a strong, unique password and never share verification codes or ownership answers publicly.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">6. Your Choices</h2>
            <p>You may at any time:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Update or clear your public bio and profile location in <Link href="/dashboard/settings" className="text-primary-600 hover:underline">Settings</Link></li>
              <li>Control phone sharing globally and separately for each report</li>
              <li>Delete your items from your dashboard</li>
              <li>Permanently delete your regular user account and associated user-owned records from <Link href="/dashboard/settings" className="text-primary-600 hover:underline">Settings</Link></li>
            </ul>
            <p className="mt-3">Account deletion requests removal of associated uploaded assets. Provider backups, caches, security logs, or records that must be retained for legal reasons may not disappear immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">7. Cookies and Local Storage</h2>
            <p>ReClaim uses two essential HTTP-only, SameSite=Lax session cookies: a short-lived access cookie and a longer-lived rotating refresh cookie. Both are marked Secure in production and cannot be read by browser JavaScript. The frontend also holds the current access token in memory while the page is open; the refresh token is never exposed to browser JavaScript.</p>
            <p className="mt-3">Local storage contains a non-sensitive marker indicating that a session may be recoverable and preferences such as language or theme. It does not store your password or refresh token. ReClaim does not use advertising or behavioural-tracking cookies, although the Google Fonts and OpenStreetMap resource requests described above are direct third-party network requests.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">8. Contact</h2>
            <p>Questions about this policy or a data request can be submitted through our <Link href="/contact" className="text-primary-600 hover:underline">Contact page</Link>.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
