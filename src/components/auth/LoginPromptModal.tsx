'use client';

import { useEffect } from 'react';
import { HiOutlineSparkles, HiOutlineBookmark, HiOutlineChartBar, HiOutlineXMark } from 'react-icons/hi2';

interface LoginPromptModalProps {
    onClose: () => void;
    featureHint?: string;
}

const FEATURES = [
    { icon: HiOutlineSparkles, text: 'AI 요약 + 웹 인용 검색' },
    { icon: HiOutlineBookmark,  text: '장소별 개인 메모 저장' },
    { icon: HiOutlineChartBar,  text: '클릭 기반 맞춤 추천' },
];

export default function LoginPromptModal({ onClose, featureHint }: LoginPromptModalProps) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleGoogle = () => { window.location.href = `${apiUrl}/oauth2/authorization/google`; };
    const handleKakao  = () => { window.location.href = `${apiUrl}/oauth2/authorization/kakao`; };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(24,24,27,0.5)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
                style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                    style={{ color: '#A1A1AA' }}
                >
                    <HiOutlineXMark className="w-4.5 h-4.5" />
                </button>

                {/* 헤더 */}
                <div className="flex flex-col gap-1 pr-6">
                    <span
                        className="text-xs font-semibold tracking-wide uppercase"
                        style={{ color: '#5E6AD2', letterSpacing: '0.06em' }}
                    >
                        {featureHint ?? 'AI 기능'}
                    </span>
                    <h2
                        className="text-[20px] font-bold tracking-tight"
                        style={{ color: '#18181B', letterSpacing: '-0.02em' }}
                    >
                        로그인하면 더 똑똑해져요
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: '#71717A' }}>
                        기본 검색은 누구나 사용 가능하지만,<br />
                        아래 기능은 로그인 후 활성화돼요.
                    </p>
                </div>

                {/* 기능 목록 */}
                <ul
                    className="flex flex-col gap-2.5 rounded-xl p-4"
                    style={{ background: '#F4F4F5', border: '1px solid #E4E4E7' }}
                >
                    {FEATURES.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-center gap-3">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(94,106,210,0.10)' }}
                            >
                                <Icon className="w-3.5 h-3.5" style={{ color: '#5E6AD2' }} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: '#52525B' }}>
                                {text}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* 로그인 버튼 — login page와 동일 스타일 */}
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                        style={{
                            background: '#FFFFFF',
                            border: '1.5px solid #E4E4E7',
                            color: '#18181B',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F4F4F5'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google 계정으로 계속
                    </button>

                    <button
                        onClick={handleKakao}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                        style={{
                            background: '#FEE500',
                            border: '1.5px solid #E8D900',
                            color: '#3C1E1E',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FADB00'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE500'; }}
                    >
                        <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                            style={{ background: '#3C1E1E', color: '#FEE500' }}
                        >
                            K
                        </span>
                        카카오 계정으로 계속
                    </button>
                </div>

                <p className="text-center text-xs" style={{ color: '#A1A1AA' }}>
                    로그인하면{' '}
                    <a href="#" className="font-semibold" style={{ color: '#5E6AD2' }}>이용약관</a>
                    {' '}및{' '}
                    <a href="#" className="font-semibold" style={{ color: '#5E6AD2' }}>개인정보처리방침</a>
                    에 동의합니다.
                </p>
            </div>
        </div>
    );
}
