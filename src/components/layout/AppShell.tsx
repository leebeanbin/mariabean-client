'use client';

import Sidebar from './Sidebar';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import AIChatWidget from '@/components/ai/AIChatWidget';

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col lg:flex-row" style={{ minHeight: '100dvh', background: '#FCFCFD' }}>
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 lg:ml-56">
                <Header />
                <main className="flex-1 px-4 lg:px-6 py-5 lg:py-6 pb-20 lg:pb-8 animate-fade-in">
                    {children}
                </main>
            </div>
            <MobileTabBar />
            <AIChatWidget />
        </div>
    );
}
