'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    HiOutlineArrowRightOnRectangle,
    HiOutlinePlusCircle,
    HiOutlineChevronDown,
} from 'react-icons/hi2';
import { useAuthStore } from '@/store/authStore';
import { NAV_ITEMS } from '@/lib/navigation';

export default function Header() {
    const { isAuthenticated, userEmail, logout } = useAuthStore();
    const pathname = usePathname();
    const [userOpen, setUserOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);
    const createRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
            if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initial = userEmail ? userEmail[0].toUpperCase() : 'U';

    return (
        <header
            className="h-12 flex items-center px-4 lg:px-5 sticky top-0 z-30"
            style={{
                background: 'rgba(252,252,253,0.82)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 1px 0 rgba(24,24,27,0.04)',
            }}
        >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mr-6 flex-shrink-0">
                <div className="relative w-6 h-6 rounded-md overflow-hidden border border-zinc-200 bg-white">
                    <Image
                        src="/icons/icon-512x512.png"
                        alt="Mariabean logo"
                        fill
                        sizes="24px"
                        className="object-contain"
                    />
                </div>
                <span className="text-[14px] font-semibold tracking-tight" style={{ color: '#18181B' }}>
                    Mariabean
                </span>
            </Link>

            {/* Nav tabs — desktop */}
            <nav className="hidden lg:flex items-center gap-0.5">
                {NAV_ITEMS.map(({ href, desktopLabel }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors"
                            style={isActive
                                ? { color: '#18181B', background: 'rgba(0,0,0,0.04)' }
                                : { color: '#71717A' }
                            }
                            onMouseEnter={e => {
                                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)';
                            }}
                            onMouseLeave={e => {
                                if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                            }}
                        >
                            {desktopLabel}
                        </Link>
                    );
                })}
            </nav>

            <div className="flex-1" />

            {/* Right side */}
            <div className="flex items-center gap-1.5">
                {/* Create dropdown */}
                <div ref={createRef} className="relative">
                    <button
                        onClick={() => setCreateOpen(!createOpen)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors"
                        style={{ color: '#52525B' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => {
                            if (!createOpen) (e.currentTarget as HTMLElement).style.background = '';
                        }}
                    >
                        <HiOutlinePlusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">새로 만들기</span>
                        <HiOutlineChevronDown className="w-3 h-3" style={{ color: '#A1A1AA' }} />
                    </button>
                    {createOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                            style={{
                                background: '#fff',
                                border: '1px solid #EBEBED',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                minWidth: '188px',
                            }}
                        >
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#A1A1AA' }}>
                                생성
                            </div>
                            <Link
                                href="/facilities/register"
                                className="flex items-center px-3 py-2 text-[13px] font-medium transition-colors hover:bg-zinc-50"
                                style={{ color: '#18181B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                시설 등록
                            </Link>
                            <div style={{ borderTop: '1px solid #F4F4F5' }} />
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#A1A1AA' }}>
                                이동
                            </div>
                            <Link
                                href="/facilities"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                시설
                            </Link>
                            <Link
                                href="/reservations"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                예약
                            </Link>
                            <Link
                                href="/map"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                지도
                            </Link>
                            <div style={{ borderTop: '1px solid #F4F4F5' }} />
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#A1A1AA' }}>
                                고객 예약
                            </div>
                            <Link
                                href="/book"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                예약 포털
                            </Link>
                            <Link
                                href="/my-reservations"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                내 예약 내역
                            </Link>
                            <div style={{ borderTop: '1px solid #F4F4F5' }} />
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#A1A1AA' }}>
                                이메일
                            </div>
                            <Link
                                href="/admin/email/templates"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                템플릿 관리
                            </Link>
                            <Link
                                href="/admin/email/send"
                                className="flex items-center px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                style={{ color: '#52525B' }}
                                onClick={() => setCreateOpen(false)}
                            >
                                이메일 발송
                            </Link>
                        </div>
                    )}
                </div>

                {/* User dropdown */}
                {isAuthenticated ? (
                    <div ref={userRef} className="relative">
                        <button
                            onClick={() => setUserOpen(!userOpen)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-opacity hover:opacity-80"
                            style={{ background: '#E4E4E7', color: '#52525B' }}
                        >
                            {initial}
                        </button>
                        {userOpen && (
                            <div
                                className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
                                style={{
                                    background: '#fff',
                                    border: '1px solid #EBEBED',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                    minWidth: '200px',
                                }}
                            >
                                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #F4F4F5' }}>
                                    <p className="text-[12px] font-medium" style={{ color: '#18181B' }}>
                                        {userEmail}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: '#A1A1AA' }}>관리자</p>
                                </div>
                                <button
                                    onClick={() => { logout(); setUserOpen(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-[13px] transition-colors hover:bg-zinc-50"
                                    style={{ color: '#71717A' }}
                                >
                                    <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/login" className="btn-primary">로그인</Link>
                )}
            </div>
        </header>
    );
}
