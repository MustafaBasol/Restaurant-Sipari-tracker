import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';

interface RegisterScreenProps {
    onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
    const { register, isLoading } = useAuth();
    const { t } = useLanguage();
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
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');
        setTenantSlug(slug);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!tenantName || !tenantSlug || !fullName || !email || !password) {
            setError(t('auth.register.allFieldsRequired'));
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
            setError(t('auth.register.failed'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">Ordo</h1>
                    <p className="text-text-secondary mt-2">{t('auth.register.title')}</p>
                </div>
                <Card>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.register.restaurantName')}</label>
                            <Input type="text" value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="e.g., Sunset Bistro" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.register.restaurantUrl')}</label>
                            <Input type="text" value={tenantSlug} onChange={handleSlugChange} placeholder="sunset-bistro" required />
                        </div>
                        <hr className="my-2 border-border-color/50"/>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.register.yourName')}</label>
                            <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.email')}</label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.doe@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.password')}</label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? '...' : t('auth.register.createAccountBtn')}
                        </Button>
                    </form>
                </Card>
                <div className="mt-8 text-center">
                    <p className="text-sm text-text-secondary">
                        {t('auth.register.haveAccount')}{' '}
                        <button onClick={onSwitchToLogin} className="font-medium text-accent hover:underline">
                            {t('auth.signIn')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
