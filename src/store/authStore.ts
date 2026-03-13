import { create } from 'zustand';
import api from '@/lib/api';

function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return {};
    }
}

function extractRole(token: string): string | null {
    const payload = decodeJwtPayload(token);
    // Spring Security typically uses 'role' or 'roles' or 'authorities'
    const role = payload.role ?? payload.roles ?? payload.authorities;
    if (Array.isArray(role)) return role[0] ?? null;
    return typeof role === 'string' ? role : null;
}

interface AuthState {
    isAuthenticated: boolean;
    accessToken: string | null;
    userEmail: string | null;
    memberId: number | null;
    userRole: string | null;
    isAdmin: boolean;
    login: (accessToken: string, refreshToken: string, email?: string, memberId?: number) => void;
    logout: () => void;
    hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    accessToken: null,
    userEmail: null,
    memberId: null,
    userRole: null,
    isAdmin: false,

    login: (accessToken, refreshToken, email, memberId) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        const userRole = extractRole(accessToken);
        set({
            isAuthenticated: true,
            accessToken,
            userEmail: email ?? null,
            memberId: memberId ?? null,
            userRole,
            isAdmin: userRole === 'ROLE_ADMIN' || userRole === 'ADMIN',
        });
    },

    logout: () => {
        // Fire-and-forget: invalidate refresh token on server (Redis)
        api.post('/api/v1/auth/logout').catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
            isAuthenticated: false,
            accessToken: null,
            userEmail: null,
            memberId: null,
            userRole: null,
            isAdmin: false,
        });
    },

    hydrate: () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                const userRole = extractRole(token);
                set({
                    isAuthenticated: true,
                    accessToken: token,
                    userRole,
                    isAdmin: userRole === 'ROLE_ADMIN' || userRole === 'ADMIN',
                });
            }
        }
    },
}));
