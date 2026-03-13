'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { hydrate, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const isDevBypass =
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!isDevBypass && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isDevBypass, router]);

    if (!isDevBypass && !isAuthenticated) return null;

    return <>{children}</>;
}
