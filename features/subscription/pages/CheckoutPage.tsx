
import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import * as api from '../api';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import CheckoutForm from '../components/CheckoutForm';
import { Card } from '../../../shared/components/ui/Card';

// IMPORTANT: Replace with your actual Stripe publishable key.
const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY_HERE');

type CheckoutStatus = 'idle' | 'processing' | 'verifying' | 'activating' | 'error';

const CheckoutPage: React.FC = () => {
    const { t } = useLanguage();
    const { authState, updateTenantInState } = useAuth();
    const [clientSecret, setClientSecret] = useState('');
    const [status, setStatus] = useState<CheckoutStatus>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchPaymentIntent = async () => {
            try {
                const { clientSecret } = await api.createPaymentIntent();
                setClientSecret(clientSecret);
            } catch (error) {
                console.error("Failed to create payment intent:", error);
                setStatus('error');
                setMessage('Could not initialize payment. Please try again later.');
            }
        };

        fetchPaymentIntent();
    }, []);

    const handleSuccess = async () => {
        if (!authState?.tenant?.id) {
            setStatus('error');
            setMessage('Authentication error. Please log in again.');
            return;
        }

        setStatus('verifying');
        setMessage(t('subscription.checkout.verifying'));
        
        try {
            // This simulates the backend receiving a webhook and activating the subscription.
            const updatedTenant = await api.confirmPaymentSuccess(authState.tenant.id);
            
            setStatus('activating');
            setMessage(t('subscription.checkout.activating'));
            
            // Update the auth context with the new subscription status.
            updateTenantInState(updatedTenant);
            
            // Redirect to the app after a short delay to show the success message.
            setTimeout(() => {
                window.location.hash = '#/app';
            }, 1500);

        } catch (error) {
            console.error("Failed to confirm payment and activate subscription", error);
            setStatus('error');
            setMessage('Failed to activate subscription after payment. Please contact support.');
        }
    };

    const options: StripeElementsOptions = {
        clientSecret,
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#007aff',
                colorBackground: '#ffffff',
                colorText: '#1d1d1f',
                colorDanger: '#ff3b30',
                fontFamily: 'Ideal Sans, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
            },
        },
    };

    const renderStatusOverlay = () => (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="font-semibold text-text-primary">{message}</p>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">{t('branding.name')}</h1>
                    <h2 className="text-2xl mt-4 font-semibold text-text-primary">{t('subscription.checkout.title')}</h2>
                    <p className="text-text-secondary mt-2">{t('subscription.checkout.subtitle')}</p>
                </div>
                <Card className="relative">
                    {status !== 'idle' && status !== 'error' && renderStatusOverlay()}
                    
                    {clientSecret ? (
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm clientSecret={clientSecret} onSuccess={handleSuccess} />
                        </Elements>
                    ) : (
                        <div className="flex items-center justify-center h-48">
                           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                        </div>
                    )}
                </Card>
                 <div className="mt-4 text-center">
                    <button onClick={() => window.history.back()} className="text-sm font-medium text-text-secondary hover:text-text-primary">
                        {t('general.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
