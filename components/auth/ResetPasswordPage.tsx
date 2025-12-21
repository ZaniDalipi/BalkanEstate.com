import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { resetPassword as resetPasswordApi } from '../../services/apiService';
import { LogoIcon, EyeIcon } from '../../constants';

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

const isCommonPassword = (password: string): boolean => {
    const lowerPassword = password.toLowerCase();
    return COMMON_PASSWORDS.some(weak => lowerPassword.includes(weak.toLowerCase()));
};

const checkPasswordRequirements = (password: string): PasswordRequirements => {
    return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noSequential: !findSequentialCharacters(password),
        notCommon: !isCommonPassword(password),
    };
};

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

const ResetPasswordPage: React.FC = () => {
    const { dispatch } = useAppContext();
    const [token, setToken] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>(checkPasswordRequirements(''));
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Get token from URL query params
        const params = new URLSearchParams(window.location.search);
        const tokenParam = params.get('token');

        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError('Invalid or missing reset token. Please request a new password reset link.');
        }
    }, []);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        const requirements = checkPasswordRequirements(newPassword);
        setPasswordRequirements(requirements);

        // Clear error if all requirements are met
        if (requirements.minLength && requirements.hasUppercase && requirements.hasLowercase &&
            requirements.hasNumber && requirements.hasSpecialChar && requirements.noSequential &&
            requirements.notCommon) {
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password requirements
        const requirements = checkPasswordRequirements(password);
        if (!requirements.minLength || !requirements.hasUppercase || !requirements.hasLowercase ||
            !requirements.hasNumber || !requirements.hasSpecialChar || !requirements.noSequential ||
            !requirements.notCommon) {
            setError('Please ensure all password requirements are met');
            return;
        }

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        setIsLoading(true);

        try {
            const user = await resetPasswordApi(token, password);
            setSuccess(true);

            // Update app context with user
            dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });

            // Redirect to home after 2 seconds
            setTimeout(() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                // Update URL without reload
                window.history.pushState({}, '', '/');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again or request a new reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    const floatingInputClasses = "peer w-full px-4 pt-6 pb-2 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
    const floatingLabelClasses = "absolute left-4 top-2 text-xs text-neutral-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs";

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex justify-center mb-6">
                        <LogoIcon className="w-12 h-12" />
                    </div>
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h3>
                        <p className="text-gray-600 mb-4">Your password has been changed successfully.</p>
                        <p className="text-sm text-gray-500">Redirecting you to the home page...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="flex justify-center mb-6">
                    <LogoIcon className="w-12 h-12" />
                </div>

                <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Reset Your Password</h2>
                <p className="text-center text-gray-600 mb-6">Enter your new password below</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* New Password */}
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={handlePasswordChange}
                            className={floatingInputClasses}
                            placeholder=" "
                            required
                            disabled={!token}
                        />
                        <label htmlFor="password" className={floatingLabelClasses}>New Password</label>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Password Requirements */}
                    {password && <PasswordRequirementsIndicator requirements={passwordRequirements} />}

                    {/* Confirm Password */}
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={floatingInputClasses}
                            placeholder=" "
                            required
                            disabled={!token}
                        />
                        <label htmlFor="confirmPassword" className={floatingLabelClasses}>Confirm New Password</label>
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !token}
                        className="w-full py-3 px-4 rounded-lg shadow-sm text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </button>

                    {/* Back to Login */}
                    <button
                        type="button"
                        onClick={() => {
                            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                            dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' });
                            window.history.pushState({}, '', '/');
                        }}
                        className="w-full text-sm font-semibold text-primary hover:underline mt-4"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
