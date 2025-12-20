import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={`w-full px-4 py-3 bg-card-bg border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent appearance-none ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
