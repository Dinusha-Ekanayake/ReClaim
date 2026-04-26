import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';
import { Search, Zap, MessageSquare, CheckCircle, Shield, Star, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-green-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-6">How ReClaim Works</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A simple, secure, and smart system that helps reunite people with their lost belongings.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {[
              {
                step: '01', icon: <Search size={32} />, color: 'bg-blue-100 text-primary-600',
                title: 'Post Your Item',
                desc: 'Whether you lost something or found something, create a detailed post in under 2 minutes. Upload photos, describe the item, add the category, color, brand, and mark the approximate location on the map.',
                tips: ['Be as specific as possible in your description', 'Add multiple photos from different angles', 'Mark the location accurately — even approximate areas help'],
              },
              {
                step: '02', icon: <Zap size={32} />, color: 'bg-green-100 text-secondary-600',
                title: 'AI-Powered Matching',
                desc: 'Our smart matching system immediately starts comparing your post against all existing reports. It uses a combination of category matching, keyword similarity, location proximity, date closeness, and AI embeddings to calculate a match score.',
                tips: ['Matches with 70%+ score send you an instant notification', 'The system re-runs matching whenever new items are posted', 'You can also manually refresh matches from your item page'],
              },
              {
                step: '03', icon: <Shield size={32} />, color: 'bg-amber-100 text-amber-600',
                title: 'Verified Claims (For Found Items)',
                desc: 'When someone finds your lost item, they can post it as "Found." If you believe it\'s yours, you submit a claim — but here\'s the key: the finder sets hidden verification questions. You must answer correctly to prove ownership, preventing fake claims.',
                tips: ['Hidden details like serial numbers or unique damage marks verify real owners', 'Claimants can also send a direct message explaining the situation', 'Finders review answers before approving or rejecting'],
              },
              {
                step: '04', icon: <MessageSquare size={32} />, color: 'bg-purple-100 text-purple-600',
                title: 'Secure In-App Chat',
                desc: 'All communication happens inside ReClaim — never share personal contact info publicly. Our real-time chat lets both parties coordinate the handover safely. Optionally, item posters can choose to show their phone number for direct contact.',
                tips: ['Your email and phone are never shown publicly by default', 'Message history is saved so you can refer back', 'Chat threads are linked to specific items for context'],
              },
              {
                step: '05', icon: <CheckCircle size={32} />, color: 'bg-green-100 text-secondary-600',
                title: 'Reunion & Closure',
                desc: 'Once the item is returned, either the owner or finder marks it as "Returned." The item status updates, and the community grows stronger. Every successful return builds trust in ReClaim.',
                tips: ['Both the owner and admin can mark items as returned', 'Returned items are archived and tracked for stats', 'Leave a comment to thank the finder!'],
              },
            ].map((s, i) => (
              <div key={s.step} className={`flex flex-col ${i % 2 === 1 ? 'sm:flex-row-reverse' : 'sm:flex-row'} gap-8 items-start`}>
                <div className="sm:w-1/3 flex-shrink-0">
                  <div className="card p-8 text-center">
                    <div className="text-xs font-mono font-bold text-gray-300 mb-3">{s.step}</div>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${s.color}`}>
                      {s.icon}
                    </div>
                    <h2 className="font-display font-bold text-gray-900">{s.title}</h2>
                  </div>
                </div>
                <div className="flex-1 py-4">
                  <p className="text-gray-600 leading-relaxed mb-5">{s.desc}</p>
                  <ul className="space-y-2">
                    {s.tips.map(tip => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-gray-500">
                        <Star size={14} className="text-amber-400 flex-shrink-0 mt-0.5 fill-amber-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Safety & Privacy</h2>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto">
            Your privacy is our priority. ReClaim is designed to connect people while keeping personal information protected.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔒', title: 'Private by Default', desc: 'Phone numbers and emails are never shown publicly unless you choose to share them.' },
              { icon: '✅', title: 'Verified Claims', desc: 'Hidden details prevent fraudulent ownership claims. Only the real owner knows.' },
              { icon: '🛡️', title: 'Admin Moderation', desc: 'Our admin team reviews reports and can remove fake or inappropriate posts.' },
            ].map(f => (
              <div key={f.title} className="card p-6 text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-display font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-blue-200 mb-8">Join thousands of people helping each other recover lost items.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register"
              className="px-8 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-blue-50 transition-all">
              Create Free Account
            </Link>
            <Link href="/items"
              className="px-8 py-4 bg-primary-500 text-white font-bold rounded-xl border-2 border-white/30 hover:bg-primary-400 transition-all flex items-center justify-center gap-2">
              Browse Items <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
