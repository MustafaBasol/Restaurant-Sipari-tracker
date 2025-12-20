import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const AuthHeader: React.FC = () => {
  const { t } = useLanguage();

  return (
    <header className="absolute top-0 left-0 right-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => (window.location.hash = '#/')}
          className="text-xl font-bold text-text-primary hover:text-text-secondary transition-colors"
        >
          {t('branding.name')}
        </button>
      </div>
    </header>
  );
};

export default AuthHeader;
