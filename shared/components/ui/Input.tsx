import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={`w-full px-4 py-3 bg-card-bg border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
                ref={ref}
                {...props}
            />
        );
    }
);