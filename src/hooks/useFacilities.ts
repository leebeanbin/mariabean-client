import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CommonResponse, SpringPage, FacilityResponse, FacilityCreateRequest, FacilityUpdateRequest } from '@/lib/types';

interface FacilityMedicalUpdateRequest {
    specialties?: string[];
    operatingHours?: Record<string, { open: string; close: string } | null>;
}


function emptyPage<T>(page: number, size: number): SpringPage<T> {
    return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true, empty: true };
}

export function useFacilities(category?: string, page = 0, size = 20) {
    const effectiveCategory = category && category !== '전체' ? category : undefined;
    return useQuery({
        queryKey: ['facilities', effectiveCategory, page, size],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<FacilityResponse>>>('/api/v1/facilities', {
                params: { page, size, ...(effectiveCategory ? { category: effectiveCategory } : {}) },
            });
            return data.data ?? emptyPage<FacilityResponse>(page, size);
        },
    });
}

export function useFacilityTotalCount() {
    return useQuery({
        queryKey: ['facilities', 'totalCount'],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<FacilityResponse>>>('/api/v1/facilities', {
                params: { page: 0, size: 1 },
            });
            return data.data?.totalElements ?? 0;
        },
    });
}

export function useFacility(facilityId: string) {
    return useQuery({
        queryKey: ['facility', facilityId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<FacilityResponse>>(`/api/v1/facilities/${facilityId}`);
            return data.data;
        },
        enabled: !!facilityId,
    });
}

export function useCreateFacility() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: FacilityCreateRequest) => {
            const { data } = await api.post<CommonResponse<FacilityResponse>>('/api/v1/facilities', request);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] });
        },
    });
}

export function useUpdateFacility() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...request }: FacilityUpdateRequest & { id: string }) => {
            const { data } = await api.put<CommonResponse<FacilityResponse>>(`/api/v1/facilities/${id}`, request);
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] });
            queryClient.invalidateQueries({ queryKey: ['facility', variables.id] });
        },
    });
}

export function useDeleteFacility() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/v1/facilities/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] });
        },
    });
}

export function useUpdateFacilityMedical() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...request }: FacilityMedicalUpdateRequest & { id: string }) => {
            const { data } = await api.patch<CommonResponse<FacilityResponse>>(
                `/api/v1/facilities/${id}/medical`,
                request,
            );
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] });
            queryClient.invalidateQueries({ queryKey: ['facility', variables.id] });
        },
    });
}
