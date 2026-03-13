import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Refresh-once queue: prevents race condition when multiple 401s arrive simultaneously ──
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const PUBLIC_PATH_PREFIXES = ['/book', '/booking-confirmation', '/login', '/auth/callback'];

function isPublicPath(pathname: string) {
    return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token!);
    });
    failedQueue = [];
}

function clearAuthAndRedirect(requestUrl?: string) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (isPublicPath(currentPath)) return;

        if (requestUrl) {
            const normalized = requestUrl.startsWith('http')
                ? requestUrl
                : `${API_BASE_URL}${requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`}`;
            if (normalized.includes('/api/v1/facilities') || normalized.includes('/api/v1/search')) {
                return;
            }
        }

        window.location.href = '/login';
    }
}

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Another refresh is already in progress — queue this request
        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newToken) => {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;

        if (!refreshToken) {
            processQueue(new Error('No refresh token'), null);
            isRefreshing = false;
            clearAuthAndRedirect(originalRequest?.url);
            return Promise.reject(error);
        }

        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, null, {
                params: { refreshToken },
            });
            const { accessToken } = res.data.data;
            localStorage.setItem('accessToken', accessToken);
            useAuthStore.setState({ accessToken });
            processQueue(null, accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            clearAuthAndRedirect(originalRequest?.url);
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
