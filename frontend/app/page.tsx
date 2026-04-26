import PublicLayout from '@/components/layout/PublicLayout';
import HeroSection from '@/components/home/HeroSection';
import { StatsSection, HowItWorks, CategoriesGrid, RecentItems, CTASection } from '@/components/home/index';

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <CategoriesGrid />
      <RecentItems />
      <CTASection />
    </PublicLayout>
  );
}
