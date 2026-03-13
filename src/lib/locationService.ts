export interface UserLocation {
    lat: number;
    lng: number;
    accuracy?: number;
}

let cachedLocation: UserLocation | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getUserLocation(): Promise<UserLocation> {
    if (cachedLocation && Date.now() - cacheTime < CACHE_TTL) {
        return Promise.resolve(cachedLocation);
    }
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                cachedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
                cacheTime = Date.now();
                resolve(cachedLocation);
            },
            (err) => reject(err),
            { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
        );
    });
}

// Default to Seoul City Hall if geolocation unavailable
export const SEOUL_DEFAULT: UserLocation = { lat: 37.5666, lng: 126.9784 };

export async function getUserLocationOrDefault(): Promise<UserLocation & { isDefault?: boolean }> {
    try {
        return await getUserLocation();
    } catch {
        return { ...SEOUL_DEFAULT, isDefault: true };
    }
}

export function formatDistance(meters: number): string {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}
