import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const baseClasses =
      'font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50';

    const variantClasses = {
      primary: 'bg-accent text-white hover:bg-accent-hover',
      secondary: 'bg-gray-200 text-text-primary hover:bg-gray-300',
      ghost: 'text-accent hover:text-accent-hover',
    };

    const sizeClasses = 'py-3 px-4'; // Default size

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
