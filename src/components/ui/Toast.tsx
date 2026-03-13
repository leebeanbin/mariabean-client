'use client';

import { useState, createContext, useContext, useCallback, useRef } from 'react';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineInformationCircle, HiOutlineXMark } from 'react-icons/hi2';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const cfg = {
    success: { icon: '#22C55E', text: '#18181B', Icon: HiOutlineCheckCircle },
    error:   { icon: '#EF4444', text: '#18181B', Icon: HiOutlineXCircle },
    info:    { icon: '#5E6AD2', text: '#18181B', Icon: HiOutlineInformationCircle },
};

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const t = timers.current.get(id);
        if (t) { clearTimeout(t); timers.current.delete(id); }
    }, []);

    const show = useCallback((type: ToastType, message: string) => {
        const id = ++_counter;
        setToasts(prev => [...prev, { id, type, message }]);
        const t = setTimeout(() => dismiss(id), 3500);
        timers.current.set(id, t);
    }, [dismiss]);

    const value: ToastContextValue = {
        success: (m) => show('success', m),
        error:   (m) => show('error', m),
        info:    (m) => show('info', m),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '340px' }}>
                {toasts.map(toast => {
                    const c = cfg[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className="animate-slide-up flex items-start gap-2.5 px-3.5 py-3 rounded-lg pointer-events-auto"
                            style={{
                                background: '#fff',
                                border: '1px solid #EBEBED',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            }}
                        >
                            <c.Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.icon }} />
                            <p className="text-[13px] font-medium flex-1 leading-snug" style={{ color: c.text }}>
                                {toast.message}
                            </p>
                            <button
                                onClick={() => dismiss(toast.id)}
                                className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-opacity hover:opacity-60"
                                style={{ color: '#A1A1AA' }}
                            >
                                <HiOutlineXMark className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
