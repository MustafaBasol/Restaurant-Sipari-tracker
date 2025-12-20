import React, { ReactNode } from 'react';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray';

interface BadgeProps {
  children: ReactNode;
  variant: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-status-free/20 text-status-free',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-status-new/20 text-status-new',
  orange: 'bg-status-occupied/20 text-status-occupied',
  gray: 'bg-status-closed/20 text-status-closed',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant, className = '' }) => {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
