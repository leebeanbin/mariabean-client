let daumPostcodePromise: Promise<void> | null = null;

export async function loadDaumPostcodeSdk(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (window.daum?.Postcode) return;

    if (!daumPostcodePromise) {
        daumPostcodePromise = new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            script.onload = () => resolve();
            script.onerror = () => {
                daumPostcodePromise = null;
                reject(new Error('Failed to load Daum Postcode SDK'));
            };
            document.head.appendChild(script);
        });
    }

    await daumPostcodePromise;
}
