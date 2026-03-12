import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAppContext } from '@/context/AppContext';
import { AppleIcon, EnvelopeIcon, GoogleIcon, LogoIcon, EyeIcon } from '@/constants';
import SocialLoginPopup from './SocialLoginPopup';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { ALL_PHONE_COUNTRY_CODES, PHONE_FORMAT_PATTERNS, formatPhoneNumber, getPhonePlaceholder, BALKAN_PHONE_CODES } from '@/constants/phoneCountryCodes';

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

interface PasswordRequirements {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noSequential: boolean;
    notCommon: boolean;
}

interface FieldErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
}


const COMMON_PASSWORDS = [
    'password', 'Password1', 'Password123', '12345678', 'qwerty',
    'abc123', 'password1', 'letmein', 'welcome', 'monkey',
    '1q2w3e4r', 'qwertyuiop', 'admin', 'root', 'user',
    'passw0rd', 'p@ssword', 'p@ssw0rd'
];

const findSequentialCharacters = (password: string): string | null => {
    const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    for (const seq of sequences) {
        for (let i = 0; i < seq.length - 2; i++) {
            const subseq = seq.substring(i, i + 3);
            if (password.toLowerCase().includes(subseq)) {
                return subseq;
            }
        }
    }
    return null;
};

const hasSequentialCharacters = (password: string): boolean => findSequentialCharacters(password) !== null;

const getCommonPasswordMatch = (password: string): string | null => {
    const lowerPassword = password.toLowerCase();
    return COMMON_PASSWORDS.find(weak => lowerPassword.includes(weak.toLowerCase())) || null;
};

const isCommonPassword = (password: string): boolean => getCommonPasswordMatch(password) !== null;

const checkPasswordRequirements = (password: string): PasswordRequirements => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noSequential: !hasSequentialCharacters(password),
    notCommon: !isCommonPassword(password),
});

const validatePassword = (password: string, t?: (key: string, defaultValue?: string, options?: Record<string, string>) => string) => {
    const requirements = checkPasswordRequirements(password);
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);

    if (!requirements.minLength) return tr('auth:validation.password.minLength', 'Password must be at least 8 characters long.');
    if (!requirements.hasUppercase) return tr('auth:validation.password.hasUppercase', 'Password must contain at least one uppercase letter.');
    if (!requirements.hasLowercase) return tr('auth:validation.password.hasLowercase', 'Password must contain at least one lowercase letter.');
    if (!requirements.hasNumber) return tr('auth:validation.password.hasNumber', 'Password must contain at least one number.');
    if (!requirements.hasSpecialChar) return tr('auth:validation.password.hasSpecialChar', 'Password must contain at least one special character.');
    if (!requirements.noSequential) {
        const match = findSequentialCharacters(password);
        if (match) return tr('auth:validation.password.sequentialWithMatch', 'Password contains sequential characters "{{match}}".', { match });
        return tr('auth:validation.password.sequential', 'Password should not contain sequential characters.');
    }
    if (!requirements.notCommon) {
        const match = getCommonPasswordMatch(password);
        if (match) return tr('auth:validation.password.commonWithMatch', 'Password contains a common pattern "{{match}}".', { match });
        return tr('auth:validation.password.common', 'Password is too common.');
    }
    return null;
};

const validateEmail = (email: string, t?: (key: string, defaultValue?: string) => string): string | null => {
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);
    if (!email.trim()) return tr('auth:validation.email.required', 'Please enter your email address');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return tr('auth:validation.email.invalid', 'Please enter a valid email address');
    return null;
};

const validatePhone = (countryCode: string, phoneNumber: string, t?: (key: string, defaultValue?: string) => string): string | null => {
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);
    if (!phoneNumber.trim()) return tr('auth:validation.phone.required', 'Phone number is required');
    if (!countryCode) return tr('auth:validation.phone.selectCountryCode', 'Please select a country code');
    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\d+$/.test(cleanNumber)) return tr('auth:validation.phone.digitsOnly', 'Phone number must contain only digits');
    if (cleanNumber.length < 6 || cleanNumber.length > 12) return tr('auth:validation.phone.invalidLength', 'Phone number must be between 6 and 12 digits');
    return null;
};

const ValidationError: React.FC<{ message?: string; show: boolean }> = ({ message, show }) => (
    <div className={`overflow-hidden transition-all duration-300 ease-out ${show && message ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/50">
            <AlertIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <span className="text-sm text-red-600 font-medium">{message}</span>
        </div>
    </div>
);

const PasswordRequirementsIndicator: React.FC<{ requirements: PasswordRequirements }> = ({ requirements }) => {
    const { t } = useTranslation(['auth']);
    const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
        <div className="flex items-center gap-2 transition-all duration-300">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${met ? 'bg-green-500 scale-100' : 'bg-neutral-300/60 scale-90'}`}>
                {met && (
                    <svg className="w-3 h-3 text-white animate-in zoom-in-50 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <span className={`text-xs transition-all duration-300 ${met ? 'text-green-700 font-medium' : 'text-neutral-500'}`}>
                {text}
            </span>
        </div>
    );

    return (
        <div className="mt-3 p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/50 space-y-2.5 shadow-inner">
            <p className="text-xs font-semibold text-neutral-600 mb-3">{t('auth:validation.passwordRequirements', 'Password requirements:')}</p>
            <div className="grid grid-cols-1 gap-2">
                <RequirementItem met={requirements.minLength} text={t('auth:validation.requirements.minLength', 'At least 8 characters')} />
                <RequirementItem met={requirements.hasUppercase} text={t('auth:validation.requirements.hasUppercase', 'One uppercase letter (A-Z)')} />
                <RequirementItem met={requirements.hasLowercase} text={t('auth:validation.requirements.hasLowercase', 'One lowercase letter (a-z)')} />
                <RequirementItem met={requirements.hasNumber} text={t('auth:validation.requirements.hasNumber', 'One number (0-9)')} />
                <RequirementItem met={requirements.hasSpecialChar} text={t('auth:validation.requirements.hasSpecialChar', 'One special character (!@#$%...)')} />
                <RequirementItem met={requirements.noSequential} text={t('auth:validation.requirements.noSequential', 'No sequential characters (123, abc)')} />
                <RequirementItem met={requirements.notCommon} text={t('auth:validation.requirements.notCommon', 'Not a common password')} />
            </div>
        </div>
    );
};

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

const RegisterPage: React.FC = () => {
    const { t: rawT } = useTranslation(['auth', 'common']);
    const t = rawT as (key: string, defaultValue?: string, options?: Record<string, string>) => string;
    const { state, dispatch, signup, loginWithSocial } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [socialLoginProvider, setSocialLoginProvider] = useState<SocialProvider | null>(null);
    const [availableProviders, setAvailableProviders] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState<string>(ALL_PHONE_COUNTRY_CODES[0].code);
    const [phoneNumber, setPhoneNumber] = useState('');

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; confirmPassword?: boolean; phone?: boolean }>({});

    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
        minLength: false, hasUppercase: false, hasLowercase: false,
        hasNumber: false, hasSpecialChar: false, noSequential: false, notCommon: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPassword(val);
        setPasswordRequirements(checkPasswordRequirements(val));
        if (touched.password) {
            const err = validatePassword(val, t);
            setFieldErrors(prev => ({ ...prev, password: err || undefined }));
        }
    };

    const handleBlur = (field: 'email' | 'password' | 'confirmPassword' | 'phone') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            const err = validateEmail(email, t as any);
            setFieldErrors(prev => ({ ...prev, email: err || undefined }));
        } else if (field === 'password') {
            const err = validatePassword(password, t);
            setFieldErrors(prev => ({ ...prev, password: err || undefined }));
        } else if (field === 'confirmPassword') {
            if (password !== confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: t('auth:validation.passwordsDoNotMatch', 'Passwords do not match') }));
            } else {
                setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
        } else if (field === 'phone') {
            const err = validatePhone(phoneCountryCode, phoneNumber, t as any);
            setFieldErrors(prev => ({ ...prev, phone: err || undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailError = validateEmail(email, t as any);
        const passwordError = validatePassword(password, t);
        const confirmError = password !== confirmPassword ? t('auth:validation.passwordsDoNotMatch', 'Passwords do not match') : null;
        const phoneError = validatePhone(phoneCountryCode, phoneNumber, t as any);

        setTouched({ email: true, password: true, confirmPassword: true, phone: true });
        setFieldErrors({
            email: emailError || undefined,
            password: passwordError || undefined,
            confirmPassword: confirmError || undefined,
            phone: phoneError || undefined,
        });

        if (emailError || passwordError || confirmError || phoneError) return;

        setIsLoading(true);
        setError(null);

        try {
            const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
            const fullPhone = cleanNumber ? `${phoneCountryCode}${cleanNumber}` : '';
            await signup(email, password, { role: 'buyer', phone: fullPhone });
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

    const navigateToLogin = () => {
        window.history.pushState({}, '', buildLocalizedPath('/login'));
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'login' });
    };

    return (
        <>
            <Helmet>
                <title>{t('auth:signup.title', 'Sign Up')} | BalkanEstate</title>
                <meta name="description" content={t('auth:signup.metaDescription', 'Create your BalkanEstate account to browse properties, save searches, and connect with agents.')} />
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

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-neutral-50 to-primary/10 p-4">
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
                            {t('auth:signup.subtitle', 'Create your account')}
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
                                        label={t('auth:signup.continueWithGoogle', 'Continue with Google')}
                                        onClick={() => handleSocialLogin('google')}
                                        disabled={isLoading}
                                    />
                                )}
                                {availableProviders.apple && (
                                    <SocialButton
                                        icon={<AppleIcon className="w-6 h-6" />}
                                        label={t('auth:signup.continueWithApple', 'Continue with Apple')}
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
                                            {t('auth:signup.orContinueWith', 'or sign up with email')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Register Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:signup.email', 'Email address')}
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
                                        placeholder={t('auth:signup.emailPlaceholder', 'you@example.com')}
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

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:signup.phone', 'Phone number')}
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={phoneCountryCode}
                                        onChange={e => setPhoneCountryCode(e.target.value)}
                                        className="w-[130px] py-3.5 px-3 rounded-2xl bg-white/60 backdrop-blur-sm
                                                   border border-white/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300 text-neutral-800 text-sm"
                                    >
                                        {ALL_PHONE_COUNTRY_CODES.map((c, i) => (
                                            <React.Fragment key={`${c.country}-${c.code}`}>
                                                {i === BALKAN_PHONE_CODES.length && (
                                                    <option disabled>──────────</option>
                                                )}
                                                <option value={c.code}>
                                                    {c.flag} {c.code}
                                                </option>
                                            </React.Fragment>
                                        ))}
                                    </select>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={e => {
                                            const formatted = formatPhoneNumber(phoneCountryCode, e.target.value);
                                            setPhoneNumber(formatted);
                                        }}
                                        onBlur={() => handleBlur('phone')}
                                        placeholder={getPhonePlaceholder(phoneCountryCode)}
                                        className={`flex-1 px-4 py-3.5 rounded-2xl
                                                   bg-white/60 backdrop-blur-sm border
                                                   ${touched.phone && fieldErrors.phone ? 'border-red-300' : 'border-white/40'}
                                                   focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300
                                                   text-neutral-800 placeholder:text-neutral-400`}
                                        autoComplete="tel"
                                    />
                                </div>
                                <ValidationError message={fieldErrors.phone} show={!!touched.phone && !!fieldErrors.phone} />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:signup.password', 'Password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={handlePasswordChange}
                                        onBlur={() => handleBlur('password')}
                                        placeholder={t('auth:signup.passwordPlaceholder', 'Create a strong password')}
                                        className={`w-full pl-4 pr-12 py-3.5 rounded-2xl
                                                   bg-white/60 backdrop-blur-sm border
                                                   ${touched.password && fieldErrors.password ? 'border-red-300' : 'border-white/40'}
                                                   focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300
                                                   text-neutral-800 placeholder:text-neutral-400`}
                                        autoComplete="new-password"
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
                                {password && <PasswordRequirementsIndicator requirements={passwordRequirements} />}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-600 mb-2">
                                    {t('auth:signup.confirmPassword', 'Confirm password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        onBlur={() => handleBlur('confirmPassword')}
                                        placeholder={t('auth:signup.confirmPasswordPlaceholder', 'Confirm your password')}
                                        className={`w-full pl-4 pr-12 py-3.5 rounded-2xl
                                                   bg-white/60 backdrop-blur-sm border
                                                   ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-300' : 'border-white/40'}
                                                   focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                                   outline-none transition-all duration-300
                                                   text-neutral-800 placeholder:text-neutral-400`}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <ValidationError message={fieldErrors.confirmPassword} show={!!touched.confirmPassword && !!fieldErrors.confirmPassword} />
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
                                    ? t('auth:signup.signingUp', 'Creating account...')
                                    : t('auth:signup.submit', 'Create Account')
                                }
                            </button>
                        </form>

                        {/* Login Link */}
                        <p className="mt-6 text-center text-sm text-neutral-500">
                            {t('auth:signup.hasAccount', 'Already have an account?')}{' '}
                            <button
                                onClick={navigateToLogin}
                                className="font-semibold text-primary hover:text-primary-dark transition-colors"
                            >
                                {t('auth:signup.logIn', 'Log in')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RegisterPage;
