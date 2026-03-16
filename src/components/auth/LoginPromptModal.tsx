'use client';

import { useEffect } from 'react';
import { HiOutlineSparkles, HiOutlineBookmark, HiOutlineChartBar, HiOutlineXMark } from 'react-icons/hi2';

interface LoginPromptModalProps {
    onClose: () => void;
    featureHint?: string; // 어떤 기능을 쓰려다가 막혔는지
}

const FEATURES = [
    { icon: HiOutlineSparkles, text: 'AI 요약 + 웹 인용 검색' },
    { icon: HiOutlineBookmark,  text: '장소별 개인 메모 저장' },
    { icon: HiOutlineChartBar,  text: '클릭 기반 맞춤 추천' },
];

export default function LoginPromptModal({ onClose, featureHint }: LoginPromptModalProps) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    // ESC 키 닫기
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
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
                style={{ background: '#1C1C1E', border: '1px solid #3F3F46' }}
                onClick={e => e.stopPropagation()}
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg transition-colors"
                    style={{ color: '#71717A' }}
                >
                    <HiOutlineXMark className="w-5 h-5" />
                </button>

                {/* 헤더 */}
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium" style={{ color: '#5E6AD2' }}>
                        {featureHint ?? 'AI 기능'}
                    </p>
                    <h2 className="text-lg font-bold" style={{ color: '#FAFAFA' }}>
                        로그인하면 더 똑똑해져요
                    </h2>
                    <p className="text-sm" style={{ color: '#A1A1AA' }}>
                        로그인 없이도 기본 검색은 가능하지만,<br />
                        아래 기능은 로그인 후 활성화돼요.
                    </p>
                </div>

                {/* 기능 목록 */}
                <ul className="flex flex-col gap-2.5">
                    {FEATURES.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(94,106,210,0.15)' }}
                            >
                                <Icon className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                            </div>
                            <span className="text-sm" style={{ color: '#D4D4D8' }}>{text}</span>
                        </li>
                    ))}
                </ul>

                {/* 로그인 버튼 */}
                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        onClick={handleGoogle}
                        className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-opacity active:opacity-80"
                        style={{ background: '#FFFFFF', color: '#18181B' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.93c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.1-10.36 7.1-17.14z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        </svg>
                        Google로 로그인
                    </button>
                    <button
                        onClick={handleKakao}
                        className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-opacity active:opacity-80"
                        style={{ background: '#FEE500', color: '#18181B' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.69 2 11.25c0 2.9 1.9 5.46 4.77 6.95l-1.18 4.38c-.1.39.34.7.68.47L11.6 19.8c.13.01.27.02.4.02 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"/>
                        </svg>
                        Kakao로 로그인
                    </button>
                </div>
            </div>
        </div>
    );
}
