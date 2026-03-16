import { NextRequest, NextResponse } from 'next/server';

// 인증 없이 접근 가능한 경로 prefix
const PUBLIC_PREFIXES = [
    '/login',
    '/book',
    '/booking-confirmation',
    '/auth',       // OAuth2 callback
    '/api',        // Next.js Route Handlers
    '/_next',
    '/icons',
    '/sw.js',
    '/manifest.json',
    '/favicon.ico',
];

// 루트 경로는 별도 허용
function isPublic(pathname: string): boolean {
    if (pathname === '/') return true;
    return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isPublic(pathname)) return NextResponse.next();

    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * _next/static, _next/image, favicon.ico 제외한 모든 경로에 적용
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
