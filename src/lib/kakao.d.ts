export {};

declare global {
    // ── Google Maps SDK ──
    interface GoogleMapOptions {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
    }
    interface GoogleMap {
        setCenter(latLng: { lat: number; lng: number }): void;
        getCenter(): { lat(): number; lng(): number };
        getBounds(): {
            getSouthWest(): { lat(): number; lng(): number };
            getNorthEast(): { lat(): number; lng(): number };
        } | undefined;
        getZoom(): number;
        setZoom(zoom: number): void;
    }
    interface GoogleMarker {
        setMap(map: GoogleMap | null): void;
    }
    interface GoogleSymbol {
        path: unknown;
        fillColor?: string;
        fillOpacity?: number;
        strokeColor?: string;
        strokeWeight?: number;
        scale?: number;
    }
    interface GoogleInfoWindow {
        open(map: GoogleMap, marker: GoogleMarker): void;
        close(): void;
    }
    interface GoogleGeocoderResult {
        geometry: { location: { lat(): number; lng(): number } };
        formatted_address: string;
    }
    interface GoogleGeocoder {
        geocode(
            request: { address?: string },
            callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
        ): void;
    }

    // ── Daum Postcode ──
    interface DaumPostcodeData {
        roadAddress: string;
        jibunAddress: string;
        zonecode: string;
        buildingName: string;
        bname: string;
        sido: string;
        sigungu: string;
    }

    // ── Window extensions ──
    interface Window {
        google: {
            maps: {
                Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
                Marker: new (options: { position: { lat: number; lng: number }; map?: GoogleMap; title?: string; icon?: GoogleSymbol }) => GoogleMarker;
                InfoWindow: new (options: { content: string }) => GoogleInfoWindow;
                Geocoder: new () => GoogleGeocoder;
                SymbolPath: {
                    CIRCLE: unknown;
                };
                event: {
                    addListener: (instance: object, eventName: string, handler: (...args: unknown[]) => void) => void;
                };
            };
        };
        kakao: {
            maps: {
                load: (cb: () => void) => void;
                Map: new (element: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
                LatLng: new (lat: number, lng: number) => KakaoLatLng;
                Marker: new (options: { position: KakaoLatLng; map?: KakaoMap; title?: string }) => KakaoMarker;
                InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
                event: { addListener: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void };
            };
        };
        daum: {
            Postcode: new (options: {
                oncomplete: (data: DaumPostcodeData) => void;
                onclose?: () => void;
            }) => { open: () => void; embed: (element: HTMLElement) => void };
        };
    }

    interface KakaoLatLng {
        getLat(): number;
        getLng(): number;
    }
    interface KakaoMap {
        setCenter(latlng: KakaoLatLng): void;
        getCenter(): KakaoLatLng;
        getBounds(): {
            getSouthWest(): KakaoLatLng;
            getNorthEast(): KakaoLatLng;
        };
    }
    interface KakaoMarker {
        setMap(map: KakaoMap | null): void;
        getPosition(): KakaoLatLng;
    }
    interface KakaoInfoWindow {
        open(map: KakaoMap, marker?: KakaoMarker): void;
        close(): void;
    }
}
