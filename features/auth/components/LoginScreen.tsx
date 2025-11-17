import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import LanguageSwitcher from '../../../shared/components/LanguageSwitcher';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import AuthHeader from './AuthHeader';

const LoginScreen: React.FC = () => {
    const { login, isLoading } = useAuth();
    const { t } = useLanguage();
    const [email, setEmail] = useState('waiter@sunsetbistro.com');
    const [password, setPassword] = useState('sunset-bistro');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(email, password);
        if (success) {
            window.location.hash = '#/app';
        } else {
            setError(t('auth.loginFailed'));
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-light-bg p-4">
            <AuthHeader />
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">{t('branding.name')}</h1>
                    <p className="text-text-secondary mt-2">{t('auth.welcome')}</p>
                </div>
                <Card>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">{t('auth.email')}</label>
                            <Input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="waiter@sunsetbistro.com"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">{t('auth.password')}</label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="sunset-bistro"
                                required
                            />
                            <p className="text-xs text-text-secondary mt-1">Hint: Use tenant slug as password for demo.</p>
                        </div>
                        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? '...' : t('auth.signIn')}
                        </Button>
                    </form>
                </Card>
                <div className="mt-8 text-center">
                     <div className="inline-block">
                        <LanguageSwitcher />
                    </div>
                    <p className="mt-4 text-sm text-text-secondary">
                        {t('auth.newHere')}{' '}
                        <button
                            onClick={() => window.location.hash = '#/register'}
                            className="font-semibold text-accent hover:underline focus:outline-none"
                        >
                            {t('auth.createAccountLink')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;