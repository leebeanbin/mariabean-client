import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
    lat: number | null;
    lng: number | null;
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
    accuracy: number | null;
    lastUpdatedAt: number | null;
    watching: boolean;
}

export function useGeolocation(autoRequest = false) {
    const [state, setState] = useState<GeolocationState>({
        lat: null,
        lng: null,
        loading: false,
        error: null,
        permissionDenied: false,
        accuracy: null,
        lastUpdatedAt: null,
        watching: false,
    });
    const watchIdRef = useRef<number | null>(null);

    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setState(s => ({ ...s, watching: false }));
        }
    // watchIdRef is a stable ref object — no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startRealtime = useCallback(() => {
        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: '이 브라우저는 위치 서비스를 지원하지 않습니다.' }));
            return;
        }
        stopWatching();
        setState(s => ({ ...s, loading: true, error: null }));

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                setState(s => ({
                    ...s,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy ?? null,
                    lastUpdatedAt: Date.now(),
                    loading: false,
                    error: null,
                    permissionDenied: false,
                    watching: true,
                }));
            },
            (err) => {
                const denied = err.code === err.PERMISSION_DENIED;
                setState(s => ({
                    ...s,
                    loading: false,
                    error: denied ? '위치 권한이 거부되었습니다.' : '실시간 위치를 업데이트할 수 없습니다.',
                    permissionDenied: denied,
                    watching: false,
                }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        );

        watchIdRef.current = id;
    }, [stopWatching]);

    const request = useCallback(() => {
        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: '이 브라우저는 위치 서비스를 지원하지 않습니다.' }));
            return;
        }
        setState(s => ({ ...s, loading: true, error: null }));
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setState(s => ({
                    ...s,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    loading: false,
                    error: null,
                    permissionDenied: false,
                    accuracy: pos.coords.accuracy ?? null,
                    lastUpdatedAt: Date.now(),
                }));
            },
            (err) => {
                const denied = err.code === err.PERMISSION_DENIED;
                setState(s => ({
                    ...s,
                    loading: false,
                    error: denied ? '위치 권한이 거부되었습니다.' : '위치를 가져올 수 없습니다.',
                    permissionDenied: denied,
                    watching: false,
                }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    }, []);

    useEffect(() => {
        if (autoRequest) request();
    }, [autoRequest, request]);

    useEffect(() => {
        return () => {
            stopWatching();
        };
    }, [stopWatching]);

    return { ...state, request, startRealtime, stopWatching };
}
