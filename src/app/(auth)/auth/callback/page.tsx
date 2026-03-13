'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

function Spinner() {
    return (
        <div
            className="w-10 h-10 rounded-full border-[3px]"
            style={{
                borderColor: '#E4E4E7',
                borderTopColor: '#5E6AD2',
                animation: 'spin 0.8s linear infinite',
            }}
        />
    );
}

function parseHash(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const hash = window.location.hash.slice(1); // remove leading '#'
    return Object.fromEntries(new URLSearchParams(hash));
}

function OAuthCallbackInner() {
    const router = useRouter();
    const { login } = useAuthStore();

    useEffect(() => {
        const params = parseHash();
        const accessToken = params['accessToken'];
        const refreshToken = params['refreshToken'];
        const memberIdRaw = params['memberId'];
        const memberId = memberIdRaw ? Number(memberIdRaw) : undefined;

        const returnUrlFromSession = typeof window !== 'undefined'
            ? sessionStorage.getItem('postLoginRedirect')
            : null;
        const redirectTargetRaw = returnUrlFromSession || '/';
        const redirectTarget = redirectTargetRaw.startsWith('/') && !redirectTargetRaw.startsWith('//')
            ? redirectTargetRaw
            : '/';

        // Clear hash from browser history to avoid token exposure in back-navigation
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
        }

        if (accessToken && refreshToken) {
            login(accessToken, refreshToken, undefined, Number.isFinite(memberId) ? memberId : undefined);
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('postLoginRedirect');
            }
            router.replace(redirectTarget);
        } else {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('postLoginRedirect');
            }
            router.replace('/login');
        }
    }, [login, router]);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-5"
            style={{ background: '#F4F4F5' }}
        >
            <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: '#5E6AD2' }}
            >
                <span className="text-xl font-bold text-white">M</span>
            </div>
            <div className="text-center">
                <Spinner />
                <p className="mt-4 text-sm font-semibold" style={{ color: '#18181B' }}>로그인 처리 중</p>
                <p className="text-xs mt-1" style={{ color: '#71717A' }}>잠시만 기다려 주세요...</p>
            </div>
        </div>
    );
}

export default function OAuthCallbackPage() {
    return <OAuthCallbackInner />;
}
