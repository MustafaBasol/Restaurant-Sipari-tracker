import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={`w-full px-4 py-3 bg-card-bg border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
                ref={ref}
                {...props}
            />
        );
    }
);
