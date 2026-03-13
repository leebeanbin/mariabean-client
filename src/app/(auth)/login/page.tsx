'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const [isLoadingProvider, setIsLoadingProvider] = useState<'google' | 'kakao' | null>(null);
    const searchParams = useSearchParams();

    const returnUrl = searchParams.get('returnUrl');
    const safeReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : null;

    const handleGoogleLogin = () => {
        setIsLoadingProvider('google');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        if (safeReturnUrl && typeof window !== 'undefined') {
            sessionStorage.setItem('postLoginRedirect', safeReturnUrl);
        }
        window.location.href = `${apiUrl}/oauth2/authorization/google`;
    };

    const handleKakaoLogin = () => {
        setIsLoadingProvider('kakao');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        if (safeReturnUrl && typeof window !== 'undefined') {
            sessionStorage.setItem('postLoginRedirect', safeReturnUrl);
        }
        window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#F4F4F5' }}>
            {/* ── Left branding panel (desktop only) ── */}
            <div
                className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 p-12 relative overflow-hidden"
                style={{ background: '#18181B' }}
            >
                {/* Glow accents */}
                <div
                    className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at top right, rgba(94,106,210,0.15) 0%, transparent 65%)' }}
                />
                <div
                    className="absolute bottom-0 left-0 w-72 h-72 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at bottom left, rgba(94,106,210,0.07) 0%, transparent 65%)' }}
                />

                {/* Logo */}
                <div className="relative flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/20 bg-white">
                        <Image
                            src="/icons/icon-512x512.png"
                            alt="Mariabean logo"
                            fill
                            sizes="36px"
                            className="object-contain"
                        />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">Mariabean</span>
                </div>

                {/* Hero */}
                <div className="relative space-y-8">
                    <div>
                        <h2 className="text-[38px] font-bold text-white leading-tight tracking-tight">
                            스마트한<br />공간 예약 관리
                        </h2>
                        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            시설 등록부터 예약·결제까지,<br />
                            Mariabean으로 한 번에 관리하세요.
                        </p>
                    </div>

                    <ul className="space-y-3.5">
                        {[
                            '실시간 공간 예약 및 대기 관리',
                            'Google Places 연동 시설 등록',
                            'KakaoPay · TossPay 결제 지원',
                            'AI 어시스턴트로 빠른 조회',
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                    style={{ background: 'rgba(94,106,210,0.25)', color: '#A5B4FC' }}
                                >
                                    ✓
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    © 2026 Mariabean. All rights reserved.
                </p>
            </div>

            {/* ── Right login panel ── */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-[360px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-zinc-200 bg-white">
                            <Image
                                src="/icons/icon-512x512.png"
                                alt="Mariabean logo"
                                fill
                                sizes="36px"
                                className="object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold tracking-tight" style={{ color: '#18181B' }}>Mariabean</span>
                    </div>

                    <div
                        className="bg-white rounded-2xl p-8"
                        style={{ border: '1px solid #E4E4E7', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
                    >
                        <div className="mb-7">
                            <h1
                                className="text-[22px] font-bold tracking-tight"
                                style={{ color: '#18181B', letterSpacing: '-0.02em' }}
                            >
                                로그인
                            </h1>
                            <p className="text-sm mt-1.5" style={{ color: '#71717A' }}>
                                서비스를 이용하시려면 로그인해 주세요.
                            </p>
                        </div>

                        {/* Google OAuth Button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoadingProvider !== null}
                            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: '#ffffff',
                                border: '1.5px solid #E4E4E7',
                                color: '#18181B',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                letterSpacing: '-0.01em',
                            }}
                            onMouseEnter={e => {
                                if (!isLoadingProvider) (e.currentTarget as HTMLButtonElement).style.background = '#F4F4F5';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                            }}
                        >
                            {isLoadingProvider === 'google' ? (
                                <>
                                    <div
                                        className="w-5 h-5 rounded-full border-2 border-t-transparent"
                                        style={{ borderColor: '#E4E4E7', borderTopColor: '#5E6AD2', animation: 'spin 0.8s linear infinite' }}
                                    />
                                    <span>연결 중...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Google 계정으로 계속</span>
                                </>
                            )}
                        </button>

                        {/* Kakao OAuth Button */}
                        <button
                            onClick={handleKakaoLogin}
                            disabled={isLoadingProvider !== null}
                            className="w-full mt-2.5 flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: '#FEE500',
                                border: '1.5px solid #E8D900',
                                color: '#3C1E1E',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                letterSpacing: '-0.01em',
                            }}
                            onMouseEnter={e => {
                                if (!isLoadingProvider) (e.currentTarget as HTMLButtonElement).style.background = '#FADB00';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = '#FEE500';
                            }}
                        >
                            {isLoadingProvider === 'kakao' ? (
                                <>
                                    <div
                                        className="w-5 h-5 rounded-full border-2 border-t-transparent"
                                        style={{ borderColor: 'rgba(60,30,30,0.25)', borderTopColor: '#3C1E1E', animation: 'spin 0.8s linear infinite' }}
                                    />
                                    <span>연결 중...</span>
                                </>
                            ) : (
                                <>
                                    <span
                                        className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold"
                                        style={{ background: '#3C1E1E', color: '#FEE500' }}
                                    >
                                        K
                                    </span>
                                    <span>카카오 계정으로 계속</span>
                                </>
                            )}
                        </button>

                        <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid #F4F4F5' }}>
                            <p className="text-xs leading-relaxed" style={{ color: '#A1A1AA' }}>
                                로그인하면{' '}
                                <a href="#" className="font-semibold hover:underline" style={{ color: '#5E6AD2' }}>이용약관</a>
                                {' '}및{' '}
                                <a href="#" className="font-semibold hover:underline" style={{ color: '#5E6AD2' }}>개인정보처리방침</a>
                                에 동의합니다.
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-xs mt-5 lg:hidden" style={{ color: '#A1A1AA' }}>
                        © 2026 Mariabean. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
