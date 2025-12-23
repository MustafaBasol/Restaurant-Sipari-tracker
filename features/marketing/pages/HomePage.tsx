import React from 'react';
import MarketingLayout from '../components/MarketingLayout';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import BenefitsSection from '../components/BenefitsSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ForWhoSection from '../components/ForWhoSection';
import CtaSection from '../components/CtaSection';
import PricingSection from '../components/PricingSection';
import FaqSection from '../components/FaqSection';

const HomePage: React.FC = () => {
  return (
    <MarketingLayout>
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <HowItWorksSection />
      <ForWhoSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </MarketingLayout>
  );
};

export default HomePage;
