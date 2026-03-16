'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { hydrate, isAuthenticated, isHydrated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            router.replace(`/login?returnUrl=${returnUrl}`);
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated) return <div style={{ minHeight: '100dvh' }} />;
    if (!isAuthenticated) return null;

    return <>{children}</>;
}
