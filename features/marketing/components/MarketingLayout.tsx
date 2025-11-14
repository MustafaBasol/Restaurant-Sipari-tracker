import React, { ReactNode } from 'react';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';

const MarketingLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="bg-light-bg">
            <MarketingHeader />
            <main>{children}</main>
            <MarketingFooter />
        </div>
    );
};

export default MarketingLayout;