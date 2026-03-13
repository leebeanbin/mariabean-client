export const NAV_ITEMS = [
    { href: '/', desktopLabel: '대시보드', mobileLabel: '홈' },
    { href: '/facilities', desktopLabel: '시설 관리', mobileLabel: '시설' },
    { href: '/reservations', desktopLabel: '예약 관리', mobileLabel: '예약' },
    { href: '/map', desktopLabel: '지도 검색', mobileLabel: '지도' },
] as const;

export const PUBLIC_NAV_ITEMS = [
    { href: '/book', desktopLabel: '예약하기', mobileLabel: '예약' },
    { href: '/my-reservations', desktopLabel: '내 예약', mobileLabel: '내 예약' },
] as const;

const BREADCRUMB_LABELS: Record<string, string> = {
    '/': '대시보드',
    '/facilities': '시설 관리',
    '/facilities/register': '시설 등록',
    '/reservations': '예약 관리',
    '/map': '지도 검색',
};

export function getBreadcrumbs(pathname: string) {
    const crumbs: { label: string; href: string }[] = [];
    const parts = pathname.split('/').filter(Boolean);
    let path = '';

    for (const part of parts) {
        path += `/${part}`;
        const label = BREADCRUMB_LABELS[path] ?? decodeURIComponent(part);
        crumbs.push({ label, href: path });
    }

    return crumbs;
}
