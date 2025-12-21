import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AppleIcon, DevicePhoneMobileIcon, EnvelopeIcon, FacebookIcon, GoogleIcon, LogoIcon, XMarkIcon, EyeIcon } from '../../constants';
import { User, UserRole, AuthModalView, Agency } from '../../types';
import SocialLoginPopup from './SocialLoginPopup';

type Method = 'email' | 'phone';
type SocialProvider = 'google' | 'facebook' | 'apple';

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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

const validatePassword = (password: string) => {
    const requirements = checkPasswordRequirements(password);

    if (!requirements.minLength) {
        return "Password must be at least 8 characters long.";
    }
    if (!requirements.hasUppercase) {
        return "Password must contain at least one uppercase letter.";
    }
    if (!requirements.hasLowercase) {
        return "Password must contain at least one lowercase letter.";
    }
    if (!requirements.hasNumber) {
        return "Password must contain at least one number.";
    }
    if (!requirements.hasSpecialChar) {
        return "Password must contain at least one special character.";
    }
    if (!requirements.noSequential) {
        const sequentialMatch = findSequentialCharacters(password);
        if (sequentialMatch) {
            return `Password contains sequential characters "${sequentialMatch}". Avoid sequences like 123, abc, or qwe.`;
        }
        return "Password should not contain sequential characters (like 123, abc).";
    }
    if (!requirements.notCommon) {
        const commonMatch = getCommonPasswordMatch(password);
        if (commonMatch) {
            return `Password contains a common pattern "${commonMatch}". Please avoid common words and phrases.`;
        }
        return "Password is too common. Please choose a more unique password.";
    }
    return null;
};

const SocialButton: React.FC<{ icon: React.ReactNode; label: string, onClick: () => void, disabled: boolean }> = ({ icon, label, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">
        <div className="w-6 h-6">{icon}</div>
        <span className="text-base font-semibold text-neutral-700">{label}</span>
    </button>
);

const PasswordRequirementsIndicator: React.FC<{ requirements: PasswordRequirements }> = ({ requirements }) => {
    const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${met ? 'bg-green-500' : 'bg-gray-300'}`}>
                {met && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <span className={`text-xs transition-colors ${met ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                {text}
            </span>
        </div>
    );

    return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
            <RequirementItem met={requirements.minLength} text="At least 8 characters" />
            <RequirementItem met={requirements.hasUppercase} text="One uppercase letter (A-Z)" />
            <RequirementItem met={requirements.hasLowercase} text="One lowercase letter (a-z)" />
            <RequirementItem met={requirements.hasNumber} text="One number (0-9)" />
            <RequirementItem met={requirements.hasSpecialChar} text="One special character (!@#$%...)" />
            <RequirementItem met={requirements.noSequential} text="No sequential characters (123, abc, qwe)" />
            <RequirementItem met={requirements.notCommon} text="Not a common password" />
        </div>
    );
};

const AuthPage: React.FC = () => {
    const { state, dispatch, login, signup, requestPasswordReset, loginWithSocial, sendPhoneCode, verifyPhoneCode, completePhoneSignup } = useAppContext();

    const [method, setMethod] = useState<Method>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [socialLoginProvider, setSocialLoginProvider] = useState<SocialProvider | null>(null);
    const [availableProviders, setAvailableProviders] = useState<{ google: boolean; facebook: boolean; apple: boolean }>({ google: false, facebook: false, apple: false });

    // Form fields state
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [isAgent, setIsAgent] = useState(false);
    const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [licenseNumber, setLicenseNumber] = useState('');
    const [agencyInvitationCode, setAgencyInvitationCode] = useState('');

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
                const { getAvailableOAuthProviders } = await import('../../services/apiService');
                const providers = await getAvailableOAuthProviders();
                setAvailableProviders(providers);
            } catch (error) {
                // Failed to fetch OAuth providers - continue with email/phone only
            }
        };
        fetchProviders();
    }, []);

    useEffect(() => {
        // Fetch agencies when user selects "I'm an agent"
        const fetchAgencies = async () => {
            if (isAgent && state.authModalView === 'signup') {
                try {
                    const { getAgencies } = await import('../../services/apiService');
                    const response = await getAgencies({});
                    setAgencies(response.agencies || []);
                } catch (error) {
                    // Failed to fetch agencies - user can still sign up without one
                }
            }
        };
        fetchAgencies();
    }, [isAgent, state.authModalView]);

    useEffect(() => {
        // Reset state when modal opens or view changes
        setError(null);
        setInfoMessage(null);
        setIsLoading(false);
    }, [state.isAuthModalOpen, state.authModalView]);

    const handleClose = () => {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: false } });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        // Update requirements in real-time
        const requirements = checkPasswordRequirements(newPassword);
        setPasswordRequirements(requirements);

        // Clear error if all requirements are met
        if (requirements.minLength && requirements.hasUppercase && requirements.hasLowercase &&
            requirements.hasNumber && requirements.hasSpecialChar && requirements.noSequential &&
            requirements.notCommon) {
            setError(null);
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
        setIsLoading(true);
        setError(null);

        if (state.authModalView === 'signup') {
            const passwordError = validatePassword(password);
            if (passwordError) {
                setError(passwordError);
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setIsLoading(false);
                return;
            }
        }

        try {
            if (state.authModalView === 'login') {
                await login(email, password);
            } else {
                const signupData: any = {
                    role: isAgent ? 'agent' : 'buyer',
                };

                // If signing up as agent, include license and optional agency code
                if (isAgent) {
                    if (!licenseNumber.trim()) {
                        setError('License number is required for agents');
                        setIsLoading(false);
                        return;
                    }
                    signupData.licenseNumber = licenseNumber.trim();
                    if (agencyInvitationCode.trim()) {
                        signupData.agencyInvitationCode = agencyInvitationCode.trim().toUpperCase();
                    }
                }

                await signup(email, password, signupData);
            }
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await login(phone, password);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally{
            setIsLoading(false);
        }
    };

    const handlePasswordResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await requestPasswordReset(email);
            dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'forgotPasswordSuccess' });
        } catch(err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await sendPhoneCode(phone);
            dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'phoneCode' });
        } catch(err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const result = await verifyPhoneCode(phone, code);
            if (result.isNew) {
                dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'phoneDetails' });
            } else {
                handleClose();
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await completePhoneSignup(phone, name, email);
            handleClose();
        } catch(err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border border-neutral-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer";
    const floatingLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

    const renderContent = () => {
        switch (state.authModalView) {
            case 'login':
            case 'signup':
                return (
                    <>
                        <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm mb-4 sm:mb-6">
                            <button onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })} className={`w-1/2 px-4 py-2 rounded-full text-base font-semibold transition-all duration-300 ${state.authModalView === 'login' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>Login</button>
                            <button onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'signup' })} className={`w-1/2 px-4 py-2 rounded-full text-base font-semibold transition-all duration-300 ${state.authModalView === 'signup' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>Sign Up</button>
                        </div>
                        <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm mb-4 sm:mb-6 max-w-xs mx-auto">
                            <button onClick={() => setMethod('email')} className={`w-1/2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${method === 'email' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><EnvelopeIcon className="w-5 h-5"/>Email</button>
                            <button onClick={() => setMethod('phone')} className={`w-1/2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${method === 'phone' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><DevicePhoneMobileIcon className="w-5 h-5"/>Phone</button>
                        </div>
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                        
                        {method === 'email' ? (
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div className="relative"><input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="email" className={floatingLabelClasses}>Email Address</label></div>
                                <div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            value={password}
                                            onChange={state.authModalView === 'signup' ? handlePasswordChange : (e => setPassword(e.target.value))}
                                            className={floatingInputClasses}
                                            placeholder=" "
                                            required
                                        />
                                        <label htmlFor="password" className={floatingLabelClasses}>Password</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {state.authModalView === 'signup' && password && (
                                        <PasswordRequirementsIndicator requirements={passwordRequirements} />
                                    )}
                                </div>
                                {state.authModalView === 'login' && <div className="text-right"><button type="button" onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'forgotPassword'})} className="text-sm font-semibold text-primary hover:underline">Forgot Password?</button></div>}
                                {state.authModalView === 'signup' && (
                                    <>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                id="confirmPassword"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className={floatingInputClasses}
                                                placeholder=" "
                                                required
                                            />
                                            <label htmlFor="confirmPassword" className={floatingLabelClasses}>Confirm Password</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeSlashIcon className="w-5 h-5" />
                                                ) : (
                                                    <EyeIcon className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Agent checkbox */}
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <input
                                                type="checkbox"
                                                id="isAgent"
                                                checked={isAgent}
                                                onChange={(e) => setIsAgent(e.target.checked)}
                                                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                                            />
                                            <label htmlFor="isAgent" className="text-sm font-medium text-gray-700">
                                                I'm a real estate agent
                                            </label>
                                        </div>

                                        {/* License and agency code fields - shown only if isAgent is true */}
                                        {isAgent && (
                                            <>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        id="licenseNumber"
                                                        value={licenseNumber}
                                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                                        className={floatingInputClasses}
                                                        placeholder=" "
                                                        required
                                                    />
                                                    <label htmlFor="licenseNumber" className={floatingLabelClasses}>
                                                        License Number
                                                    </label>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        id="agencyInvitationCode"
                                                        value={agencyInvitationCode}
                                                        onChange={(e) => setAgencyInvitationCode(e.target.value.toUpperCase())}
                                                        className={floatingInputClasses}
                                                        placeholder=" "
                                                    />
                                                    <label htmlFor="agencyInvitationCode" className={floatingLabelClasses}>
                                                        Agency Invitation Code (Optional)
                                                    </label>
                                                    <p className="text-xs text-gray-500 mt-1 ml-1">
                                                        Leave empty to register as an independent agent
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                                <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm text-base sm:text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Processing...' : (state.authModalView === 'login' ? 'Log In' : 'Sign Up')}</button>
                            </form>
                        ) : state.authModalView === 'login' ? (
                            <form onSubmit={handlePhoneLogin} className="space-y-4">
                                <div className="relative"><input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="phone" className={floatingLabelClasses}>Phone Number</label></div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="phonePassword"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className={floatingInputClasses}
                                        placeholder=" "
                                        required
                                    />
                                    <label htmlFor="phonePassword" className={floatingLabelClasses}>Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm text-base sm:text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Processing...' : 'Log In'}</button>
                            </form>
                        ) : (
                             <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                <div className="relative"><input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="phone" className={floatingLabelClasses}>Phone Number</label></div>
                                <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm text-base sm:text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Sending...' : 'Send Code'}</button>
                            </form>
                        )}
                        
                        {(availableProviders.google || availableProviders.facebook || availableProviders.apple) && (
                            <>
                                <div className="my-4 sm:my-6 flex items-center"><div className="flex-grow border-t border-neutral-300"></div><span className="flex-shrink mx-4 text-neutral-500 font-medium text-sm">Or continue with</span><div className="flex-grow border-t border-neutral-300"></div></div>
                                <div className="space-y-3">
                                    {availableProviders.google && <SocialButton icon={<GoogleIcon/>} label="Continue with Google" onClick={() => handleSocialLoginClick('google')} disabled={isLoading} />}
                                    {availableProviders.facebook && <SocialButton icon={<FacebookIcon/>} label="Continue with Facebook" onClick={() => handleSocialLoginClick('facebook')} disabled={isLoading} />}
                                    {availableProviders.apple && <SocialButton icon={<AppleIcon className="text-black"/>} label="Continue with Apple" onClick={() => handleSocialLoginClick('apple')} disabled={isLoading} />}
                                </div>
                            </>
                        )}
                    </>
                );
            case 'forgotPassword':
                return (
                    <>
                        <h3 className="text-lg font-bold text-center mb-4">Reset Password</h3>
                        <p className="text-sm text-neutral-600 text-center mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                        <form onSubmit={handlePasswordResetRequest} className="space-y-4">
                             <div className="relative"><input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="email" className={floatingLabelClasses}>Email Address</label></div>
                            <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Sending...' : 'Send Reset Link'}</button>
                            <button type="button" onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })} className="w-full text-sm font-semibold text-primary hover:underline mt-2">Back to Login</button>
                        </form>
                    </>
                );
            case 'forgotPasswordSuccess':
                 return (
                    <div className="text-center">
                        <h3 className="text-lg font-bold mb-4">Check Your Email</h3>
                        <p className="text-sm text-neutral-600 mb-6">We've sent a password reset link to <span className="font-semibold">{email}</span>.</p>
                        <button onClick={() => dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' })} className="w-full py-3 px-4 rounded-lg font-bold text-white bg-primary hover:bg-primary-dark">Back to Login</button>
                    </div>
                );
            case 'phoneCode':
                 return (
                    <>
                        <h3 className="text-lg font-bold text-center mb-4">Enter Code</h3>
                        <p className="text-sm text-neutral-600 text-center mb-6">We've sent a 6-digit code to <span className="font-semibold">{phone}</span>.</p>
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                        <form onSubmit={handleCodeSubmit} className="space-y-4">
                             <div className="relative"><input type="text" id="code" value={code} onChange={e => setCode(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="code" className={floatingLabelClasses}>6-Digit Code</label></div>
                            <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Verifying...' : 'Verify'}</button>
                            <button type="button" onClick={() => { setMethod('phone'); dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' }); }} className="w-full text-sm font-semibold text-primary hover:underline mt-2">Back</button>
                        </form>
                    </>
                );
            case 'phoneDetails':
                 return (
                     <>
                        <h3 className="text-lg font-bold text-center mb-4">Complete Your Profile</h3>
                        <p className="text-sm text-neutral-600 text-center mb-6">Just a few more details to create your account.</p>
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                        <form onSubmit={handlePhoneDetailsSubmit} className="space-y-4">
                            <div className="relative"><input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="name" className={floatingLabelClasses}>Full Name</label></div>
                            <div className="relative"><input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={floatingInputClasses} placeholder=" " required /><label htmlFor="email" className={floatingLabelClasses}>Email Address</label></div>
                            <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 px-4 rounded-lg shadow-sm font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{isLoading ? 'Creating Account...' : 'Complete Sign Up'}</button>
                        </form>
                    </>
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
            <div className="fixed inset-0 z-[5000] flex justify-center items-center bg-black/50 p-4" onClick={handleClose}>
                <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-2xl md:shadow-2xl flex flex-col relative overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleClose} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 z-10" aria-label="Close authentication modal"><XMarkIcon className="w-6 h-6" /></button>
                    <div className="p-6 sm:p-8 w-full max-w-md mx-auto mt-8 md:mt-0">
                        <div className="flex justify-center items-center space-x-2 mb-4"><LogoIcon className="w-8 h-8 text-primary" /></div>
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 text-center mb-4 sm:mb-6">
                            {state.authModalView === 'login' ? 'Welcome Back!' : 'Create an Account'}
                        </h2>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;