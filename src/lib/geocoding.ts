/**
 * Address → coordinates geocoding.
 * Tries backend(place search via Kakao+Google) first, then Google Maps Geocoder.
 */
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
const geocodeInflight = new Map<string, Promise<{ lat: number; lng: number } | null>>();

export async function geocodeAddress(
    address: string,
): Promise<{ lat: number; lng: number } | null> {
    const normalized = address.trim().toLowerCase();
    if (!normalized) return null;
    if (geocodeCache.has(normalized)) return geocodeCache.get(normalized) ?? null;
    if (geocodeInflight.has(normalized)) return geocodeInflight.get(normalized) ?? null;

    const work = (async (): Promise<{ lat: number; lng: number } | null> => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    try {
        const res = await fetch(
            `${apiBaseUrl}/api/v1/facilities/places/search?query=${encodeURIComponent(address)}`,
        );
        if (res.ok) {
            const json = await res.json();
            const first = json?.data?.[0];
            if (first?.latitude && first?.longitude) {
                return { lat: Number(first.latitude), lng: Number(first.longitude) };
            }
        }
    } catch {
        // fall through to next provider
    }

    if (typeof window !== 'undefined' && window.google?.maps) {
        return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results?.[0]) {
                    resolve({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng(),
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    return null;
    })();

    geocodeInflight.set(normalized, work);
    const result = await work;
    geocodeInflight.delete(normalized);
    geocodeCache.set(normalized, result);
    return result;
}
