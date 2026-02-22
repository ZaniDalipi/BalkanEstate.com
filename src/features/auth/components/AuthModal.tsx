import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { AppleIcon, EnvelopeIcon, GoogleIcon, LogoIcon, XMarkIcon, EyeIcon } from '@/constants';
import SocialLoginPopup from './SocialLoginPopup';

type SocialProvider = 'google' | 'apple';

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

// Animated alert icon for validation errors
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

// Balkan country codes for phone number input
const BALKAN_COUNTRY_CODES = [
    { code: '+383', country: 'XK', label: 'Kosovo', flag: '🇽🇰' },
    { code: '+355', country: 'AL', label: 'Albania', flag: '🇦🇱' },
    { code: '+381', country: 'RS', label: 'Serbia', flag: '🇷🇸' },
    { code: '+389', country: 'MK', label: 'N. Macedonia', flag: '🇲🇰' },
    { code: '+387', country: 'BA', label: 'Bosnia', flag: '🇧🇦' },
    { code: '+382', country: 'ME', label: 'Montenegro', flag: '🇲🇪' },
    { code: '+385', country: 'HR', label: 'Croatia', flag: '🇭🇷' },
    { code: '+386', country: 'SI', label: 'Slovenia', flag: '🇸🇮' },
    { code: '+359', country: 'BG', label: 'Bulgaria', flag: '🇧🇬' },
    { code: '+40', country: 'RO', label: 'Romania', flag: '🇷🇴' },
    { code: '+30', country: 'GR', label: 'Greece', flag: '🇬🇷' },
] as const;

// Phone number format patterns per country code (groups of digits)
const PHONE_FORMAT_PATTERNS: Record<string, number[]> = {
    '+383': [2, 3, 4],    // Kosovo: 44 123 4567
    '+355': [2, 3, 4],    // Albania: 69 123 4567
    '+381': [2, 3, 4],    // Serbia: 63 123 4567
    '+389': [2, 3, 3],    // N. Macedonia: 70 123 456
    '+387': [2, 3, 3],    // Bosnia: 61 123 456
    '+382': [2, 3, 3],    // Montenegro: 67 123 456
    '+385': [2, 3, 4],    // Croatia: 91 123 4567
    '+386': [2, 3, 2, 2], // Slovenia: 31 123 45 67
    '+359': [2, 3, 4],    // Bulgaria: 88 123 4567
    '+40':  [3, 3, 3],    // Romania: 721 123 456
    '+30':  [3, 3, 4],    // Greece: 694 123 4567
};

const formatPhoneNumber = (countryCode: string, digits: string): string => {
    const clean = digits.replace(/\D/g, '');
    const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
    const parts: string[] = [];
    let pos = 0;
    for (const groupSize of pattern) {
        if (pos >= clean.length) break;
        parts.push(clean.slice(pos, pos + groupSize));
        pos += groupSize;
    }
    // Append any remaining digits to the last group
    if (pos < clean.length && parts.length > 0) {
        parts[parts.length - 1] += clean.slice(pos);
    }
    return parts.join(' ');
};

const getPhonePlaceholder = (countryCode: string): string => {
    const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
    return pattern.map(n => 'X'.repeat(n)).join(' ');
};

const validatePhone = (countryCode: string, phoneNumber: string, t?: (key: string, defaultValue?: string) => string): string | null => {
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);
    // Phone is required
    if (!phoneNumber.trim()) {
        return tr('auth:validation.phone.required', 'Phone number is required');
    }
    if (!countryCode) {
        return tr('auth:validation.phone.selectCountryCode', 'Please select a country code');
    }
    // Remove any spaces or dashes from the number
    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
    // Must be digits only
    if (!/^\d+$/.test(cleanNumber)) {
        return tr('auth:validation.phone.digitsOnly', 'Phone number must contain only digits');
    }
    // Must be between 6 and 12 digits
    if (cleanNumber.length < 6 || cleanNumber.length > 12) {
        return tr('auth:validation.phone.invalidLength', 'Phone number must be between 6 and 12 digits');
    }
    return null;
};

// Common weak passwords to reject (matching backend)
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

const hasSequentialCharacters = (password: string): boolean => {
    return findSequentialCharacters(password) !== null;
};

const getCommonPasswordMatch = (password: string): string | null => {
    const lowerPassword = password.toLowerCase();
    const match = COMMON_PASSWORDS.find(weak => lowerPassword.includes(weak.toLowerCase()));
    return match || null;
};

const isCommonPassword = (password: string): boolean => {
    return getCommonPasswordMatch(password) !== null;
};

const checkPasswordRequirements = (password: string): PasswordRequirements => {
    return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noSequential: !hasSequentialCharacters(password),
        notCommon: !isCommonPassword(password),
    };
};

const validatePassword = (password: string, t?: (key: string, defaultValue?: string, options?: Record<string, string>) => string) => {
    const requirements = checkPasswordRequirements(password);
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);

    if (!requirements.minLength) {
        return tr('auth:validation.password.minLength', 'Password must be at least 8 characters long.');
    }
    if (!requirements.hasUppercase) {
        return tr('auth:validation.password.hasUppercase', 'Password must contain at least one uppercase letter.');
    }
    if (!requirements.hasLowercase) {
        return tr('auth:validation.password.hasLowercase', 'Password must contain at least one lowercase letter.');
    }
    if (!requirements.hasNumber) {
        return tr('auth:validation.password.hasNumber', 'Password must contain at least one number.');
    }
    if (!requirements.hasSpecialChar) {
        return tr('auth:validation.password.hasSpecialChar', 'Password must contain at least one special character.');
    }
    if (!requirements.noSequential) {
        const sequentialMatch = findSequentialCharacters(password);
        if (sequentialMatch) {
            return tr('auth:validation.password.sequentialWithMatch', 'Password contains sequential characters "{{match}}". Avoid sequences like 123, abc, or qwe.', { match: sequentialMatch });
        }
        return tr('auth:validation.password.sequential', 'Password should not contain sequential characters (like 123, abc).');
    }
    if (!requirements.notCommon) {
        const commonMatch = getCommonPasswordMatch(password);
        if (commonMatch) {
            return tr('auth:validation.password.commonWithMatch', 'Password contains a common pattern "{{match}}". Please avoid common words and phrases.', { match: commonMatch });
        }
        return tr('auth:validation.password.common', 'Password is too common. Please choose a more unique password.');
    }
    return null;
};

const validateEmail = (email: string, t?: (key: string, defaultValue?: string) => string): string | null => {
    const tr = t || ((key: string, defaultValue?: string) => defaultValue || key);
    if (!email.trim()) {
        return tr('auth:validation.email.required', 'Please enter your email address');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return tr('auth:validation.email.invalid', 'Please enter a valid email address');
    }
    return null;
};

// Glassmorphism styled social button
const SocialButton: React.FC<{ icon: React.ReactNode; label: string, onClick: () => void, disabled: boolean }> = ({ icon, label, onClick, disabled }) => (
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

// Custom validation error message component with animation
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

const AuthPage: React.FC = () => {
    const { t } = useTranslation(['auth', 'common']);
    const { state, dispatch, login, signup, requestPasswordReset, loginWithSocial } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [socialLoginProvider, setSocialLoginProvider] = useState<SocialProvider | null>(null);
    const [availableProviders, setAvailableProviders] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });

    // Form fields state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState(BALKAN_COUNTRY_CODES[0].code);
    const [phoneNumber, setPhoneNumber] = useState('');

    // Field-level errors for custom validation
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; confirmPassword?: boolean; phone?: boolean }>({});

    // Password requirements state for real-time feedback
    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noSequential: false,
        notCommon: false,
    });

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Fetch available OAuth providers
        const fetchProviders = async () => {
            try {
                const { getAvailableOAuthProviders } = await import('@/services/apiService');
                const providers = await getAvailableOAuthProviders();
                setAvailableProviders(providers);
            } catch (error) {
                // Failed to fetch OAuth providers - continue with email only
            }
        };
        fetchProviders();
    }, []);

    useEffect(() => {
        // Reset state when modal opens or view changes
        setError(null);
        setIsLoading(false);
        setFieldErrors({});
        setTouched({});
    }, [state.isAuthModalOpen, state.authModalView]);

    const handleClose = () => {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: false } });
    };

    const handleBlur = (field: 'email' | 'password' | 'confirmPassword' | 'phone') => {

        setTouched(prev => ({ ...prev, [field]: true }));

        // Validate on blur
        if (field === 'email') {
            const emailError = validateEmail(email, t);
            setFieldErrors(prev => ({ ...prev, email: emailError || undefined }));
        } else if (field === 'password' && state.authModalView === 'signup') {
            const passwordError = validatePassword(password, t);
            setFieldErrors(prev => ({ ...prev, password: passwordError || undefined }));
        } else if (field === 'confirmPassword') {
            if (password !== confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: t('auth:validation.passwordsDoNotMatch', 'Passwords do not match') }));
            } else {
                setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
        } else if (field === 'phone') {
            const phoneError = validatePhone(phoneCountryCode, phoneNumber, t);
            setFieldErrors(prev => ({ ...prev, phone: phoneError || undefined }));
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        // Update requirements in real-time
        const requirements = checkPasswordRequirements(newPassword);
        setPasswordRequirements(requirements);

        // Clear password error if all requirements are met
        if (requirements.minLength && requirements.hasUppercase && requirements.hasLowercase &&
            requirements.hasNumber && requirements.hasSpecialChar && requirements.noSequential &&
            requirements.notCommon) {
            setFieldErrors(prev => ({ ...prev, password: undefined }));
            setError(null);
        }

        // Also check confirm password match if it's been touched
        if (touched.confirmPassword && confirmPassword) {
            if (newPassword !== confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: t('auth:validation.passwordsDoNotMatch', 'Passwords do not match') }));
            } else {
                setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
        }
    };

    // --- Social Login Handlers ---
    const handleSocialLoginClick = (provider: SocialProvider) => {
        setIsLoading(true); // Disable buttons on main modal
        setSocialLoginProvider(provider);
    };

    const handleSocialLoginSuccess = (provider: SocialProvider) => {
        // Initiate OAuth flow by redirecting to backend
        loginWithSocial(provider);
        // No need to close modal or handle success here - the OAuth callback page will handle it
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Custom validation before submit
        const emailError = validateEmail(email, t);
        let passwordError: string | null = null;
        let confirmError: string | null = null;
        let phoneError: string | null = null;

        if (state.authModalView === 'signup') {
            passwordError = validatePassword(password);
            if (password !== confirmPassword) {
                confirmError = t('auth:validation.passwordsDoNotMatch', 'Passwords do not match');
            }
            // Phone is required - validate on signup
            phoneError = validatePhone(phoneCountryCode, phoneNumber, t);
        } else {
            // Login - just check if password is provided
            if (!password.trim()) {
                passwordError = t('auth:validation.pleaseEnterPassword', 'Please enter your password');
            }
        }

        // Set all errors and mark fields as touched
        setTouched({ email: true, password: true, confirmPassword: true, phone: true });
        setFieldErrors({
            email: emailError || undefined,
            password: passwordError || undefined,
            confirmPassword: confirmError || undefined,
            phone: phoneError || undefined,
        });

        // If any errors, don't proceed
        if (emailError || passwordError || confirmError || phoneError) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (state.authModalView === 'login') {
                await login(email, password);
            } else {
                // Build full phone number with country code (only if provided)
                const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
                const fullPhone = cleanNumber ? `${phoneCountryCode}${cleanNumber}` : '';
                // All users register as buyers - they can upgrade to agent from profile settings
                await signup(email, password, { role: 'buyer', phone: fullPhone });
            }
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth:validation.genericError', 'An error occurred. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate email first
        const emailError = validateEmail(email, t);
        setTouched({ email: true });
        setFieldErrors({ email: emailError || undefined });

        if (emailError) return;

        setIsLoading(true);
        setError(null);
        try {
            await requestPasswordReset(email);
            dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'forgotPasswordSuccess' });
        } catch(err) {
            setError(err instanceof Error ? err.message : t('auth:validation.genericError', 'An error occurred. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    // Glassmorphism input styles
    const glassInputClasses = (hasError: boolean) => `
        block w-full px-4 py-4 text-base text-neutral-900
        bg-white/50 backdrop-blur-sm rounded-2xl
        border-2 transition-all duration-300
        ${hasError
            ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
            : 'border-white/60 hover:border-white/80 focus:border-primary/50 focus:ring-4 focus:ring-primary/10'
        }
        focus:outline-none focus:bg-white/70
        placeholder:text-neutral-400
    `;

    const renderContent = () => {
        switch (state.authModalView) {
            case 'login':
            case 'signup':
                return (
                    <>
                        {/* Glass tab switcher */}
                        <div className="bg-white/30 backdrop-blur-md p-1.5 rounded-2xl flex items-center space-x-1 border border-white/40 shadow-inner mb-6">
                            <button
                                onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })}
                                className={`w-1/2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 ${
                                    state.authModalView === 'login'
                                        ? 'bg-white/90 text-primary shadow-lg shadow-primary/10'
                                        : 'text-neutral-600 hover:bg-white/40'
                                }`}
                            >
                                {t('auth:login.title')}
                            </button>
                            <button
                                onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'signup' })}
                                className={`w-1/2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 ${
                                    state.authModalView === 'signup'
                                        ? 'bg-white/90 text-primary shadow-lg shadow-primary/10'
                                        : 'text-neutral-600 hover:bg-white/40'
                                }`}
                            >
                                {t('auth:signup.title')}
                            </button>
                        </div>

                        {/* Global error message */}
                        {error && (
                            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 animate-in slide-in-from-top-2 duration-300">
                                <AlertIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-red-600 font-medium">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
                            {/* Email field */}
                            <div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value);
                                        if (touched.email) {
                                            const err = validateEmail(e.target.value, t);
                                            setFieldErrors(prev => ({ ...prev, email: err || undefined }));
                                        }
                                    }}
                                    onBlur={() => handleBlur('email')}
                                    className={glassInputClasses(!!fieldErrors.email && touched.email)}
                                    placeholder={t('auth:login.email')}
                                    autoComplete="email"
                                />
                                <ValidationError
                                    message={fieldErrors.email}
                                    show={!!touched.email && !!fieldErrors.email}
                                />
                            </div>

                            {/* Phone number field (signup only, required) */}
                            {state.authModalView === 'signup' && (
                                <div>
                                    <div className={`flex items-center rounded-2xl border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm ${
                                        fieldErrors.phone && touched.phone
                                            ? 'border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100'
                                            : 'border-white/60 hover:border-white/80 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10'
                                    }`}>
                                        <select
                                            value={phoneCountryCode}
                                            onChange={(e) => {
                                                const newCode = e.target.value;
                                                setPhoneCountryCode(newCode);
                                                // Re-format existing number with new country pattern
                                                if (phoneNumber) {
                                                    const digits = phoneNumber.replace(/\D/g, '');
                                                    setPhoneNumber(formatPhoneNumber(newCode, digits));
                                                }
                                                if (touched.phone) {
                                                    const err = validatePhone(newCode, phoneNumber, t);
                                                    setFieldErrors(prev => ({ ...prev, phone: err || undefined }));
                                                }
                                            }}
                                            className="bg-transparent text-sm text-neutral-700 font-medium pl-4 pr-1 py-4 border-none focus:outline-none focus:ring-0 cursor-pointer"
                                        >
                                            {BALKAN_COUNTRY_CODES.map((cc) => (
                                                <option key={cc.code} value={cc.code}>
                                                    {cc.flag} {cc.code} {cc.country}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="w-px h-6 bg-neutral-300/60 flex-shrink-0" />
                                        <input
                                            type="tel"
                                            id="phone"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                // Strip non-digits, then format based on country
                                                const digits = e.target.value.replace(/\D/g, '');
                                                const formatted = formatPhoneNumber(phoneCountryCode, digits);
                                                setPhoneNumber(formatted);
                                                if (touched.phone) {
                                                    const err = validatePhone(phoneCountryCode, formatted, t);
                                                    setFieldErrors(prev => ({ ...prev, phone: err || undefined }));
                                                }
                                            }}
                                            onBlur={() => handleBlur('phone')}
                                            className="flex-1 bg-transparent text-base text-neutral-900 px-3 py-4 border-none focus:outline-none focus:ring-0 placeholder:text-neutral-400"
                                            placeholder={getPhonePlaceholder(phoneCountryCode)}
                                            autoComplete="tel-national"
                                        />
                                    </div>
                                    <ValidationError
                                        message={fieldErrors.phone}
                                        show={!!touched.phone && !!fieldErrors.phone}
                                    />
                                </div>
                            )}

                            {/* Password field */}
                            <div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={state.authModalView === 'signup' ? handlePasswordChange : (e => {
                                            setPassword(e.target.value);
                                            if (touched.password && !e.target.value.trim()) {
                                                setFieldErrors(prev => ({ ...prev, password: t('auth:validation.pleaseEnterPassword', 'Please enter your password') }));
                                            } else if (touched.password) {
                                                setFieldErrors(prev => ({ ...prev, password: undefined }));
                                            }
                                        })}
                                        onBlur={() => handleBlur('password')}
                                        className={`${glassInputClasses(!!fieldErrors.password && touched.password)} pr-12`}
                                        placeholder={t('auth:login.password')}
                                        autoComplete={state.authModalView === 'signup' ? 'new-password' : 'current-password'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-1 rounded-lg hover:bg-white/50"
                                        aria-label={showPassword ? t('auth:validation.hidePassword', 'Hide password') : t('auth:validation.showPassword', 'Show password')}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <ValidationError
                                    message={fieldErrors.password}
                                    show={!!touched.password && !!fieldErrors.password && state.authModalView === 'login'}
                                />
                                {state.authModalView === 'signup' && password && (
                                    <PasswordRequirementsIndicator requirements={passwordRequirements} />
                                )}
                            </div>

                            {/* Forgot password link */}
                            {state.authModalView === 'login' && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'forgotPassword'})}
                                        className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                                    >
                                        {t('auth:login.forgotPassword')}
                                    </button>
                                </div>
                            )}

                            {/* Confirm password field (signup only) */}
                            {state.authModalView === 'signup' && (
                                <div>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={e => {
                                                setConfirmPassword(e.target.value);
                                                if (touched.confirmPassword) {
                                                    if (password !== e.target.value) {
                                                        setFieldErrors(prev => ({ ...prev, confirmPassword: t('auth:validation.passwordsDoNotMatch', 'Passwords do not match') }));
                                                    } else {
                                                        setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                                    }
                                                }
                                            }}
                                            onBlur={() => handleBlur('confirmPassword')}
                                            className={`${glassInputClasses(!!fieldErrors.confirmPassword && touched.confirmPassword)} pr-12`}
                                            placeholder={t('auth:signup.confirmPassword')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-1 rounded-lg hover:bg-white/50"
                                            aria-label={showConfirmPassword ? t('auth:validation.hidePassword', 'Hide password') : t('auth:validation.showPassword', 'Show password')}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    <ValidationError
                                        message={fieldErrors.confirmPassword}
                                        show={!!touched.confirmPassword && !!fieldErrors.confirmPassword}
                                    />
                                </div>
                            )}

                            {/* Submit button with gradient */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-4 px-6 rounded-2xl text-base font-bold text-white
                                           bg-gradient-to-r from-primary to-primary-dark
                                           hover:from-primary-dark hover:to-primary
                                           shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                                           disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t('common:loading')}
                                    </span>
                                ) : (
                                    state.authModalView === 'login' ? t('auth:login.submit') : t('auth:signup.submit')
                                )}
                            </button>
                        </form>

                        {/* Social login section */}
                        {(availableProviders.google || availableProviders.apple) && (
                            <>
                                <div className="my-6 flex items-center">
                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent"></div>
                                    <span className="flex-shrink mx-4 text-neutral-500 font-medium text-sm">{t('auth:login.orContinueWith')}</span>
                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent"></div>
                                </div>
                                <div className="space-y-3">
                                    {availableProviders.google && (
                                        <SocialButton
                                            icon={<GoogleIcon/>}
                                            label={t('auth:login.google')}
                                            onClick={() => handleSocialLoginClick('google')}
                                            disabled={isLoading}
                                        />
                                    )}
                                    {availableProviders.apple && (
                                        <SocialButton
                                            icon={<AppleIcon className="text-black"/>}
                                            label={t('auth:login.apple')}
                                            onClick={() => handleSocialLoginClick('apple')}
                                            disabled={isLoading}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </>
                );
            case 'forgotPassword':
                return (
                    <>
                        <h3 className="text-xl font-bold text-center mb-3 text-neutral-800">{t('auth:forgotPassword.title')}</h3>
                        <p className="text-sm text-neutral-500 text-center mb-6">{t('auth:forgotPassword.subtitle')}</p>

                        {error && (
                            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50">
                                <AlertIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-red-600 font-medium">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handlePasswordResetRequest} noValidate className="space-y-4">
                            <div>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value);
                                        if (touched.email) {
                                            const err = validateEmail(e.target.value, t);
                                            setFieldErrors(prev => ({ ...prev, email: err || undefined }));
                                        }
                                    }}
                                    onBlur={() => handleBlur('email')}
                                    className={glassInputClasses(!!fieldErrors.email && touched.email)}
                                    placeholder={t('auth:login.email')}
                                    autoComplete="email"
                                />
                                <ValidationError
                                    message={fieldErrors.email}
                                    show={!!touched.email && !!fieldErrors.email}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 rounded-2xl text-base font-bold text-white
                                           bg-gradient-to-r from-primary to-primary-dark
                                           hover:from-primary-dark hover:to-primary
                                           shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                                           disabled:opacity-50"
                            >
                                {isLoading ? t('common:loading') : t('auth:forgotPassword.submit')}
                            </button>
                            <button
                                type="button"
                                onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })}
                                className="w-full text-sm font-semibold text-primary hover:text-primary-dark transition-colors mt-2"
                            >
                                {t('auth:forgotPassword.backToLogin')}
                            </button>
                        </form>
                    </>
                );
            case 'forgotPasswordSuccess':
                 return (
                    <div className="text-center py-4">
                        {/* Success icon with animation */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100/80 backdrop-blur-sm flex items-center justify-center animate-in zoom-in-50 duration-300">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-neutral-800">{t('auth:forgotPassword.checkEmail')}</h3>
                        <p className="text-sm text-neutral-500 mb-6">{t('auth:forgotPassword.emailSent', { email })}</p>
                        <button
                            onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-white
                                       bg-gradient-to-r from-primary to-primary-dark
                                       hover:from-primary-dark hover:to-primary
                                       shadow-lg shadow-primary/25 transition-all duration-300"
                        >
                            {t('auth:forgotPassword.backToLogin')}
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };


    return (
        <>
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

            {/* CSS Keyframes for magical animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>

            {/* Backdrop with animated gradient */}
            <div
                className="fixed inset-0 z-[5000] flex justify-center items-start md:items-center p-0 md:p-4 overflow-y-auto"
                onClick={handleClose}
            >
                {/* Glassmorphism backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-neutral-900/60 to-primary/30 backdrop-blur-md" />

                {/* Animated gradient orbs for visual interest */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                </div>

                {/* Modal container with liquid glass effect */}
                <div
                    className="relative bg-white/80 backdrop-blur-2xl w-full min-h-screen
                               md:min-h-0 md:h-auto md:max-w-md md:max-h-[90vh]
                               md:rounded-3xl md:shadow-2xl md:shadow-black/20
                               md:border md:border-white/50
                               flex flex-col md:my-4 overflow-y-auto
                               animate-in fade-in-0 zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-white/30 pointer-events-none" />

                    {/* Close button with glass effect */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full
                                   bg-white/60 backdrop-blur-sm border border-white/50
                                   text-neutral-500 hover:text-neutral-800 hover:bg-white/80
                                   transition-all duration-300 hover:scale-110 active:scale-95
                                   shadow-lg shadow-black/5"
                        aria-label={t('auth:validation.closeAuthModal', 'Close authentication modal')}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>

                    {/* Content */}
                    <div className="relative p-6 sm:p-8 w-full max-w-md mx-auto pb-8">
                        {/* Magical Logo Container */}
                        <div className="flex justify-center items-center mb-6 pt-4 md:pt-0">
                            <div className="relative group">
                                {/* Outer glow rings */}
                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/40 via-blue-400/30 to-primary/40 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 animate-pulse" style={{ animationDuration: '3s' }} />
                                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-blue-300/20 to-primary/20 blur-lg opacity-40 animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />

                                {/* Main container with floating animation */}
                                <div
                                    className="relative p-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl shadow-primary/20"
                                    style={{
                                        animation: 'float 4s ease-in-out infinite',
                                    }}
                                >
                                    {/* Inner shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-white/40 pointer-events-none rounded-3xl" />

                                    {/* Animated sparkles */}
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-ping" style={{ animationDuration: '2s' }} />
                                    <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-primary rounded-full opacity-50 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

                                    {/* Logo SVG - Full size display */}
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                                        <LogoIcon className="w-full h-full drop-shadow-lg" />
                                    </div>
                                </div>

                                {/* Floating particles */}
                                <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-br from-blue-400 to-primary rounded-full opacity-70 animate-bounce" style={{ animationDuration: '2s' }} />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-br from-primary to-blue-500 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 text-center mb-6">
                            {state.authModalView === 'login' ? t('auth:login.subtitle') :
                             state.authModalView === 'signup' ? t('auth:signup.subtitle') : ''}
                        </h2>

                        {renderContent()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;
