import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Button } from '../../../shared/components/ui/Button';

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is not strictly needed if we handle the result directly,
        // but it's good practice for redirection-based flows.
        return_url: `${window.location.origin}${window.location.pathname}#/app`,
      },
      redirect: 'if_required', // We handle the success/error case ourselves
    });

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || t('subscription.checkout.error'));
      } else {
        setMessage(t('subscription.checkout.error'));
      }
      setIsLoading(false);
    } else {
      setMessage(t('subscription.checkout.success'));
      onSuccess();
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full mt-6">
        <span id="button-text">
          {isLoading
            ? t('subscription.checkout.processing')
            : t('subscription.checkout.payButton').replace('{amount}', '9.90 €')}
        </span>
      </Button>
      {message && (
        <div id="payment-message" className="text-sm text-red-500 mt-4 text-center">
          {message}
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
