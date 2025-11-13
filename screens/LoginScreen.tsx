
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

interface LoginScreenProps {
    onSwitchToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister }) => {
    const { login, t, isLoading } = useAppContext();
    const [email, setEmail] = useState('waiter@sunsetbistro.com');
    const [password, setPassword] = useState('sunset-bistro');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // NOTE: In this mock app, password is the tenant slug for simplicity.
        const success = await login(email, password);
        if (!success) {
            setError(t('loginFailed'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">Ordo</h1>
                    <p className="text-text-secondary mt-2">{t('welcomeToOrdo')}</p>
                </div>
                <div className="bg-card-bg p-8 rounded-2xl shadow-subtle">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">{t('email')}</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="waiter@sunsetbistro.com"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">{t('password')}</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="sunset-bistro"
                                required
                            />
                            <p className="text-xs text-text-secondary mt-1">Hint: Use tenant slug as password for demo.</p>
                        </div>
                        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-accent text-white font-semibold py-3 px-4 rounded-xl hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200 disabled:opacity-50"
                        >
                            {isLoading ? '...' : t('signIn')}
                        </button>
                    </form>
                </div>
                <div className="mt-8 text-center">
                     <div className="inline-block">
                        <LanguageSwitcher />
                    </div>
                    <p className="mt-4 text-sm text-text-secondary">
                        New here?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="font-semibold text-accent hover:underline focus:outline-none"
                        >
                            Create a Restaurant Account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
