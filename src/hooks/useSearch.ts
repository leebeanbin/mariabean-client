import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { CommonResponse, SpringPage, PlaceSearchResult, ResourceItemSearchDocument, FacilitySearchDocument, HospitalSearchResult } from '@/lib/types';

/**
 * Multi-provider place search.
 * Priority: Backend(Internal+Kakao+Google) → Google geocoder(frontend fallback)
 */
export function usePlacesSearch(query: string, debounceMs = 450) {
    const normalizedQuery = query.trim();
    const debouncedQuery = useDebounce(normalizedQuery, debounceMs);
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    return useQuery({
        queryKey: ['placesSearch', debouncedQuery],
        queryFn: async ({ signal }): Promise<PlaceSearchResult[]> => {
            try {
                const { data } = await api.get<CommonResponse<PlaceSearchResult[]>>(
                    '/api/v1/facilities/places/search',
                    { params: { query: debouncedQuery }, signal, timeout: 2500 },
                );
                const fromBackend = data.data ?? [];
                if (fromBackend.length > 0) return fromBackend;
            } catch {
                // rate limit / network 지연 시에는 UI를 멈추지 않고 fallback 또는 빈 결과로 빠르게 반환
            }
            if (googleKey && window.google?.maps) {
                return searchViaGoogle(debouncedQuery);
            }
            return [];
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

function searchViaGoogle(query: string): Promise<PlaceSearchResult[]> {
    return new Promise((resolve) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
            if (status === 'OK' && results) {
                resolve(
                    results.map((r, i) => ({
                        placeId: `google-${i}`,
                        name: r.formatted_address,
                        address: r.formatted_address,
                        latitude: r.geometry.location.lat(),
                        longitude: r.geometry.location.lng(),
                        provider: 'GOOGLE',
                        matchType: 'ADDRESS' as const,
                    })),
                );
            } else {
                resolve([]);
            }
        });
    });
}

export function usePlaceDetails(placeId: string) {
    return useQuery({
        queryKey: ['placeDetails', placeId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<PlaceSearchResult>>(`/api/v1/facilities/places/${placeId}`);
            return data.data;
        },
        enabled: !!placeId,
    });
}

export function useResourceSearch(keyword: string, page = 0, size = 20) {
    return useQuery({
        queryKey: ['resourceSearch', keyword, page, size],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<ResourceItemSearchDocument>>>('/api/v1/search/resources', {
                params: { keyword, page, size },
            });
            return data.data;
        },
        enabled: keyword.length >= 1,
    });
}

export function useNearbyFacilities(lat: number | null, lng: number | null, radiusKm = 2, page = 0, size = 20) {
    return useQuery({
        queryKey: ['nearbyFacilities', lat, lng, radiusKm, page],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<FacilitySearchDocument>>>('/api/v1/search/facilities/nearby', {
                params: { lat, lng, radiusKm, page, size },
            });
            return data.data;
        },
        enabled: lat !== null && lng !== null,
    });
}

export function useHospitalSearch(
    lat: number | null,
    lng: number | null,
    params: {
        specialties?: string[];
        symptom?: string;
        query?: string;          // 자연어 쿼리 "강남 정형외과"
        openNow?: boolean;
        radiusKm?: number;
    },
    page = 0,
    size = 20,
) {
    const { specialties, symptom, query, openNow, radiusKm = 5 } = params;
    const hasInput = (specialties && specialties.length > 0) || !!symptom || (!!query && query.length >= 2);
    const enabled = lat !== null && lng !== null && !!hasInput;

    return useQuery({
        queryKey: ['hospitalSearch', lat, lng, radiusKm, specialties, symptom, query, openNow, page, size],
        queryFn: async () => {
            const queryParams: Record<string, unknown> = { lat, lng, radiusKm, page, size };
            if (query && query.length >= 2) {
                queryParams.query = query;
            } else {
                if (symptom) queryParams.symptom = symptom;
                if (specialties && specialties.length > 0) queryParams.specialties = specialties.join(',');
            }
            if (openNow !== undefined) queryParams.openNow = openNow;

            const { data } = await api.get<CommonResponse<SpringPage<HospitalSearchResult>>>(
                '/api/v1/search/hospitals/nearby',
                { params: queryParams },
            );
            return data.data;
        },
        enabled,
        staleTime: 60_000,
    });
}

export function useHiraSpecialties() {
    return useQuery({
        queryKey: ['hiraSpecialties'],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<Array<{ code: string; name: string }>>>(
                '/api/v1/search/hospitals/specialties',
            );
            return data.data;
        },
        staleTime: Infinity,
    });
}
