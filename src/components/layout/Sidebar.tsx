'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    HiOutlineHome, HiOutlineBuildingOffice2,
    HiOutlineCalendarDays, HiOutlineMap,
    HiOutlineArrowRightOnRectangle,
    HiMiniHome, HiMiniBuildingOffice2,
    HiMiniCalendarDays, HiMiniMap,
} from 'react-icons/hi2';
import { useAuthStore } from '@/store/authStore';
import { NAV_ITEMS } from '@/lib/navigation';

const navIcons = {
    '/': { icon: HiOutlineHome, activeIcon: HiMiniHome },
    '/facilities': { icon: HiOutlineBuildingOffice2, activeIcon: HiMiniBuildingOffice2 },
    '/reservations': { icon: HiOutlineCalendarDays, activeIcon: HiMiniCalendarDays },
    '/map': { icon: HiOutlineMap, activeIcon: HiMiniMap },
} as const;

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, isAuthenticated, userEmail } = useAuthStore();

    return (
        <aside
            className="hidden lg:flex flex-col w-56 min-h-screen fixed left-0 top-0 z-40"
            style={{ background: '#18181B' }}
        >
            {/* Logo */}
            <div
                className="h-14 flex items-center px-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="relative w-6 h-6 rounded-md overflow-hidden border border-white/20 bg-white flex-shrink-0">
                        <Image
                            src="/icons/icon-512x512.png"
                            alt="Mariabean logo"
                            fill
                            sizes="24px"
                            className="object-contain"
                        />
                    </div>
                    <span className="text-[13px] font-semibold text-white tracking-tight">
                        Mariabean
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-2 px-2 overflow-y-auto">
                <ul className="space-y-0.5">
                    {NAV_ITEMS.map(({ href, desktopLabel }) => {
                        const icons = navIcons[href];
                        const Icon = icons.icon;
                        const ActiveIcon = icons.activeIcon;
                        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-100"
                                    style={isActive
                                        ? { background: 'rgba(255,255,255,0.08)', color: '#FAFAFA' }
                                        : { color: '#A1A1AA' }
                                    }
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ''; }}
                                >
                                    {isActive
                                        ? <ActiveIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#FAFAFA' }} />
                                        : <Icon className="w-4 h-4 flex-shrink-0" />
                                    }
                                    <span>{desktopLabel}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User */}
            <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {isAuthenticated && userEmail && (
                    <div className="flex items-center gap-2 px-2.5 py-2">
                        <div
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                            style={{ background: '#5E6AD2' }}
                        >
                            {userEmail[0].toUpperCase()}
                        </div>
                        <span className="text-[12px] truncate" style={{ color: '#71717A' }}>
                            {userEmail}
                        </span>
                    </div>
                )}
                {isAuthenticated && (
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-100"
                        style={{ color: '#71717A' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                        <HiOutlineArrowRightOnRectangle className="w-4 h-4 flex-shrink-0" />
                        로그아웃
                    </button>
                )}
            </div>
        </aside>
    );
}
