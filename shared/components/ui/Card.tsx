import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'default' | 'none';
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'default' }) => {
    const paddingClass = padding === 'default' ? 'p-6 sm:p-8' : '';
    
    return (
        <div className={`bg-card-bg rounded-2xl shadow-subtle ${paddingClass} ${className}`}>
            {children}
        </div>
    );
};
