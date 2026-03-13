let kakaoLoaderPromise: Promise<void> | null = null;

export async function loadKakaoMapSdk(appKey: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.kakao?.maps) return;
  if (kakaoLoaderPromise) return kakaoLoaderPromise;

  kakaoLoaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Kakao SDK load failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-kakao-map-sdk', 'true');
    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error('Kakao maps load API unavailable'));
        return;
      }
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error('Kakao SDK load failed'));
    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
}

