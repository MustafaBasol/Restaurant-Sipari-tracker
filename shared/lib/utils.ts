export const formatCurrency = (amount: number, currency: string): string => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(amount);
    } catch (e) {
        // Fallback for invalid currency code
        console.warn(`Invalid currency code: ${currency}`);
        return `$${amount.toFixed(2)}`;
    }
};

export const formatDateTime = (date: Date | string, timeZone: string, options?: Intl.DateTimeFormatOptions): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(undefined, {
            ...options,
            timeZone,
        }).format(dateObj);
    } catch (e) {
        console.warn(`Invalid timezone or date: ${timeZone}`, date);
        // Fallback
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString();
    }
};
