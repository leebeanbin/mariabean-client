'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { hydrate, isAuthenticated, isHydrated } = useAuthStore();
    const router = useRouter();
    const isDevBypass = process.env.NODE_ENV === 'development';

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (isHydrated && !isDevBypass && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isHydrated, isDevBypass, router]);

    if (!isHydrated) return <div style={{ minHeight: '100dvh' }} />;
    if (!isDevBypass && !isAuthenticated) return null;

    return <>{children}</>;
}
