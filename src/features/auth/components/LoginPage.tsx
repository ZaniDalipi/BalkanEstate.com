import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAppContext } from '@/context/AppContext';
import { AppleIcon, EnvelopeIcon, GoogleIcon, LogoIcon, EyeIcon } from '@/constants';
import SocialLoginPopup from './SocialLoginPopup';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { validateEmail } from '@/shared/utils/validation';

type SocialProvider = 'google' | 'apple';

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

interface FieldErrors {
    email?: string;
    password?: string;
}


const ValidationError: React.FC<{ message?: string; show: boolean }> = ({ message, show }) => (
    <div className={`overflow-hidden transition-all duration-300 ease-out ${show && message ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/50">
            <AlertIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <span className="text-sm text-red-600 font-medium">{message}</span>
        </div>
    </div>
);

const SocialButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean }> = ({ icon, label, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                   bg-white/60 backdrop-blur-sm border border-white/40
                   rounded-2xl hover:bg-white/80 hover:border-white/60
                   hover:shadow-lg hover:shadow-primary/5
                   transition-all duration-300 disabled:opacity-50
                   group"
    >
        <div className="w-6 h-6 transition-transform duration-300 group-hover:scale-110">{icon}</div>
        <span className="text-base font-semibold text-neutral-700">{label}</span>
    </button>
);

const LoginPage: React.FC = () => {
    const { t: rawT } = useTranslation(['auth', 'common']);
    const t = rawT as (key: string, defaultValue?: string) => string;
    const { state, dispatch, login, loginWithSocial } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [socialLoginProvider, setSocialLoginProvider] = useState<SocialProvider | null>(null);
    const [availableProviders, setAvailableProviders] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const { getAvailableOAuthProviders } = await import('@/services/apiService');
                const providers = await getAvailableOAuthProviders();
                setAvailableProviders(providers);
            } catch {
                // Failed to fetch OAuth providers - continue with email only
            }
        };
        fetchProviders();
    }, []);

    // Redirect if already authenticated
    useEffect(() => {
        if (state.isAuthenticated) {
            window.history.pushState({}, '', buildLocalizedPath('/search'));
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        }
    }, [state.isAuthenticated, dispatch]);

    const handleBlur = (field: 'email' | 'password') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            const emailResult = validateEmail(email);
            setFieldErrors(prev => ({ ...prev, email: emailResult.isValid ? undefined : emailResult.error }));
        } else if (field === 'password') {
            if (!password.trim()) {
                setFieldErrors(prev => ({ ...prev, password: t('auth:validation.pleaseEnterPassword', 'Please enter your password') }));
            } else {
                setFieldErrors(prev => ({ ...prev, password: undefined }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailResult = validateEmail(email);
        const emailError = emailResult.isValid ? null : emailResult.error;
        let passwordError: string | null = null;
        if (!password.trim()) {
            passwordError = t('auth:validation.pleaseEnterPassword', 'Please enter your password');
        }

        setTouched({ email: true, password: true });
        setFieldErrors({
            email: emailError || undefined,
            password: passwordError || undefined,
        });

        if (emailError || passwordError) return;

        setIsLoading(true);
        setError(null);

        try {
            await login(email, password);
            window.history.pushState({}, '', buildLocalizedPath('/search'));
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth:validation.genericError', 'An error occurred. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = (provider: SocialProvider) => {
        setSocialLoginProvider(provider);
        setIsLoading(true);
    };

    const handleSocialLoginSuccess = (provider: SocialProvider) => {
        setSocialLoginProvider(null);
        setIsLoading(false);
        loginWithSocial(provider);
    };

    const navigateToRegister = () => {
        window.history.pushState({}, '', buildLocalizedPath('/register'));
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'register' });
    };

    const navigateToForgotPassword = () => {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'forgotPassword' } });
    };

    return (
        <>
            <Helmet>
                <title>{t('auth:login.title', 'Log In')} | BalkanEstate</title>
                <meta name="description" content={t('auth:login.metaDescription', 'Log in to your BalkanEstate account to manage properties, saved searches, and more.')} />
            </Helmet>

            {socialLoginProvider && (
                <SocialLoginPopup
                    provider={socialLoginProvider}
                    onSuccess={() => handleSocialLoginSuccess(socialLoginProvider)}
                    onClose={() => {
                        setSocialLoginProvider(null);
                        setIsLoading(false);
                    }}
                />
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-neutral-50 to-primary/10 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
                <div className="w-full max-w-md">
                    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/10 border border-white/50 p-6 sm:p-8">
                        {/* Logo */}
                        <div className="flex justify-center items-center mb-6">
                            <div className="relative group">
                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/40 via-blue-400/30 to-primary/40 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 animate-pulse" style={{ animationDuration: '3s' }} />
                                <div
                                    className="relative p-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl shadow-primary/20"
                                    style={{ animation: 'float 4s ease-in-out infinite' }}
                                >
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                                        <LogoIcon className="w-full h-full drop-shadow-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 text-center mb-6">
                            {t('auth:login.subtitle', 'Welcome back')}
                        </h1>

                        {/* Error */}
                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50/80 border border-red-200/50 text-sm text-red-600 font-medium">
                                {error}
                            </div>
                        )}

                        {/* Social Login */}
                        {(availableProviders.google || availableProviders.apple) && (
                            <div className="space-y-3 mb-6">
                                {availableProviders.google && (
                                    <SocialButton
                                        icon={<GoogleIcon className="w-6 h-6" />}
                                        label={t('auth:login.continueWithGoogle', 'Continue with Google')}
                                        onClick={() => handleSocialLogin('google')}
                                        disabled={isLoading}
                                    />
                                )}
                                {availableProviders.apple && (
                                    <SocialButton
                                        icon={<AppleIcon className="w-6 h-6" />}
                                        label={t('auth:login.continueWithApple', 'Continue with Apple')}
                                        onClick={() => handleSocialLogin('apple')}
                                        disabled={isLoading}
                                    />
                                )}
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-neutral-200/60" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white/80 text-neutral-400 font-medium">
                                            {t('auth:login.orContinueWith', 'or continue with email')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:login.email', 'Email address')}
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <EnvelopeIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onBlur={() => handleBlur('email')}
                                        placeholder={t('auth:login.emailPlaceholder', 'you@example.com')}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl
                                                   bg-white/60 backdrop-blur-sm border
                                                   ${touched.email && fieldErrors.email ? 'border-red-300' : 'border-white/40'}
                                                   focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300
                                                   text-neutral-800 placeholder:text-neutral-400`}
                                        autoComplete="email"
                                    />
                                </div>
                                <ValidationError message={fieldErrors.email} show={!!touched.email && !!fieldErrors.email} />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:login.password', 'Password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onBlur={() => handleBlur('password')}
                                        placeholder={t('auth:login.passwordPlaceholder', 'Enter your password')}
                                        className={`w-full pl-4 pr-12 py-3.5 rounded-2xl
                                                   bg-white/60 backdrop-blur-sm border
                                                   ${touched.password && fieldErrors.password ? 'border-red-300' : 'border-white/40'}
                                                   focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300
                                                   text-neutral-800 placeholder:text-neutral-400`}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                    >
                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <ValidationError message={fieldErrors.password} show={!!touched.password && !!fieldErrors.password} />
                            </div>

                            {/* Forgot Password */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={navigateToForgotPassword}
                                    className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                                >
                                    {t('auth:login.forgotPassword', 'Forgot your password?')}
                                </button>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-white
                                           bg-gradient-to-r from-primary to-primary-dark
                                           hover:from-primary-dark hover:to-primary
                                           shadow-lg shadow-primary/25
                                           transition-all duration-300 disabled:opacity-50
                                           active:scale-[0.98]"
                            >
                                {isLoading
                                    ? t('auth:login.loggingIn', 'Logging in...')
                                    : t('auth:login.submit', 'Log In')
                                }
                            </button>
                        </form>

                        {/* Register Link */}
                        <p className="mt-6 text-center text-sm text-neutral-500">
                            {t('auth:login.noAccount', "Don't have an account?")}{' '}
                            <button
                                onClick={navigateToRegister}
                                className="font-semibold text-primary hover:text-primary-dark transition-colors"
                            >
                                {t('auth:login.signUp', 'Sign up')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
