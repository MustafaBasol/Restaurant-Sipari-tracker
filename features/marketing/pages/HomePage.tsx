import React from 'react';
import MarketingLayout from '../components/MarketingLayout';
import HeroSection from '../components/HeroSection';
import BenefitsSection from '../components/BenefitsSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ForWhoSection from '../components/ForWhoSection';
import CtaSection from '../components/CtaSection';
import PricingSection from '../components/PricingSection';

const HomePage: React.FC = () => {
  return (
    <MarketingLayout>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <ForWhoSection />
      <PricingSection />
      <CtaSection />
    </MarketingLayout>
  );
};

export default HomePage;
