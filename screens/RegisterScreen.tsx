
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

interface RegisterScreenProps {
    onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
    const { register, t, isLoading } = useAppContext();
    const [tenantName, setTenantName] = useState('');
    const [tenantSlug, setTenantSlug] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const slug = value
            .toLowerCase()
            .replace(/\s+/g, '-') // replace spaces with -
            .replace(/[^\w-]+/g, ''); // remove all non-word chars
        setTenantSlug(slug);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!tenantName || !tenantSlug || !fullName || !email || !password) {
            setError("All fields are required.");
            return;
        }

        const success = await register({
            tenantName,
            tenantSlug,
            adminFullName: fullName,
            adminEmail: email,
            adminPassword: password,
        });

        if (!success) {
            setError("Registration failed. The restaurant URL or email might already be taken.");
        }
        // On success, the AppContext will change authState and App.tsx will render the dashboard.
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">Ordo</h1>
                    <p className="text-text-secondary mt-2">Create your restaurant account</p>
                </div>
                <div className="bg-card-bg p-8 rounded-2xl shadow-subtle">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Restaurant Name</label>
                            <input
                                type="text"
                                value={tenantName}
                                onChange={(e) => setTenantName(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="e.g., Sunset Bistro"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Restaurant URL Slug</label>
                             <input
                                type="text"
                                value={tenantSlug}
                                onChange={handleSlugChange}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="sunset-bistro"
                                required
                            />
                        </div>
                        <hr className="my-2 border-border-color/50"/>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Your Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="john.doe@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-light-bg border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                required
                            />
                        </div>
                        
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-accent text-white font-semibold py-3 px-4 rounded-xl hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200 disabled:opacity-50"
                        >
                            {isLoading ? '...' : 'Create Account'}
                        </button>
                    </form>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-sm text-text-secondary">
                        Already have an account?{' '}
                        <button onClick={onSwitchToLogin} className="font-medium text-accent hover:underline">
                            {t('signIn')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
