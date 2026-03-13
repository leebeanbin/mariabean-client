'use client';

import QueryProvider from './QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <QueryProvider>
                {children}
            </QueryProvider>
        </ToastProvider>
    );
}
