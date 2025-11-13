import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={`w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        );
    }
);
