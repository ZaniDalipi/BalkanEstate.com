import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleIcon, AppleIcon, SpinnerIcon, XMarkIcon } from '@/constants';
import { isEmbeddedWebView, getOAuthUrl } from '../api/authApi';

type Provider = 'google' | 'apple';

interface SocialLoginPopupProps {
    provider: Provider;
    onSuccess: () => void;
    onClose: () => void;
}

const providerDetails: Record<Provider, { name: string; icon: React.ReactNode }> = {
    google: { name: 'Google', icon: <GoogleIcon /> },
    apple: { name: 'Apple', icon: <AppleIcon className="text-black" /> },
};

const SocialLoginPopup: React.FC<SocialLoginPopupProps> = ({ provider, onSuccess, onClose }) => {
    const details = providerDetails[provider];
    const isInApp = isEmbeddedWebView();
    const [copied, setCopied] = useState(false);

    // Keep the latest onSuccess without making the redirect effect depend on it.
    // AuthModal passes a fresh inline arrow on every render, so depending on
    // `onSuccess` directly would re-run the effect on each re-render (loading
    // state, context/websocket updates, …), tearing down and re-arming the
    // timer — and re-firing the OAuth navigation. In an installed PWA that
    // surfaced as the login "looping" through several Redirecting to Google…
    // cycles before it finally completed.
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;

    // Guarantees the OAuth redirect is triggered exactly once for the lifetime
    // of this popup, no matter how many times the component re-renders.
    const hasRedirectedRef = useRef(false);

    useEffect(() => {
        if (isInApp) return; // Don't auto-redirect in in-app browsers
        if (hasRedirectedRef.current) return;
        const redirectTimer = setTimeout(() => {
            if (hasRedirectedRef.current) return;
            hasRedirectedRef.current = true;
            onSuccessRef.current();
        }, 500);
        return () => clearTimeout(redirectTimer);
    }, [isInApp]);

    const pageUrl = window.location.href;

    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(pageUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [pageUrl]);

    const handleOpenInBrowser = useCallback(() => {
        // Android: try intent URL to open in Chrome or default browser
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid) {
            const intentUrl = `intent://${pageUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
            window.location.href = intentUrl;
            return;
        }
        // iOS and others: window.open may break out of some WebViews
        window.open(pageUrl, '_system');
    }, [pageUrl]);

    if (isInApp) {
        return (
            <div className="fixed inset-0 bg-black/30 z-[6000] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-fade-in">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6">{details.icon}</div>
                            <h2 className="font-semibold text-neutral-700">Sign in with {details.name}</h2>
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
                            <XMarkIcon className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-neutral-700 font-medium text-sm">
                            {details.name} sign-in doesn't work in this browser. Please open this page in your default browser.
                        </p>

                        <button
                            onClick={handleOpenInBrowser}
                            className="w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm"
                        >
                            Open in Browser
                        </button>

                        <button
                            onClick={handleCopyLink}
                            className="w-full py-2.5 px-4 bg-neutral-100 text-neutral-700 font-medium rounded-lg hover:bg-neutral-200 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Link Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copy Link
                                </>
                            )}
                        </button>

                        <p className="text-neutral-400 text-xs">
                            Paste the link in Safari, Chrome, or your preferred browser
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/30 z-[6000] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-fade-in">
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6">{details.icon}</div>
                        <h2 className="font-semibold text-neutral-700">Sign in with {details.name}</h2>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center justify-center h-48">
                    <SpinnerIcon className="w-12 h-12 text-primary" />
                    <p className="mt-4 text-neutral-600 font-medium">Redirecting to {details.name}...</p>
                </div>
            </div>
        </div>
    );
};

export default SocialLoginPopup;
