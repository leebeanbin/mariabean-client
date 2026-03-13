let googleLoaderPromise: Promise<void> | null = null;

export async function loadGoogleMapSdk(apiKey: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!apiKey) throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing');

    if (window.google?.maps) return;

    if (!googleLoaderPromise) {
        googleLoaderPromise = new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ko`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                googleLoaderPromise = null;
                reject(new Error('Failed to load Google Maps SDK'));
            };
            document.head.appendChild(script);
        });
    }

    await googleLoaderPromise;
}
