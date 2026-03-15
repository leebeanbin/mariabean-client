'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HiOutlineHome, HiOutlineBuildingOffice2,
    HiOutlineCalendarDays, HiOutlineMap,
    HiMiniHome, HiMiniBuildingOffice2,
    HiMiniCalendarDays, HiMiniMap,
} from 'react-icons/hi2';
import { NAV_ITEMS } from '@/lib/navigation';

const tabIcons = {
    '/': { icon: HiOutlineHome, activeIcon: HiMiniHome },
    '/facilities': { icon: HiOutlineBuildingOffice2, activeIcon: HiMiniBuildingOffice2 },
    '/reservations': { icon: HiOutlineCalendarDays, activeIcon: HiMiniCalendarDays },
    '/map': { icon: HiOutlineMap, activeIcon: HiMiniMap },
} as const;

export default function MobileTabBar() {
    const pathname = usePathname();

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
            aria-label="하단 탐색 메뉴"
            style={{
                background: 'rgba(252,252,253,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 -1px 0 rgba(24,24,27,0.04)',
            }}
        >
            <div className="flex items-center h-14" role="list">
                {NAV_ITEMS.map(({ href, mobileLabel }) => {
                    const icons = tabIcons[href];
                    const Icon = icons.icon;
                    const ActiveIcon = icons.activeIcon;
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            role="listitem"
                            aria-label={mobileLabel}
                            aria-current={isActive ? 'page' : undefined}
                            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                        >
                            {isActive
                                ? <ActiveIcon className="w-[18px] h-[18px]" style={{ color: '#5E6AD2' }} />
                                : <Icon className="w-[18px] h-[18px]" style={{ color: '#A1A1AA' }} />
                            }
                            <span
                                className="text-[10px] font-medium"
                                style={{ color: isActive ? '#5E6AD2' : '#A1A1AA' }}
                            >
                                {mobileLabel}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
