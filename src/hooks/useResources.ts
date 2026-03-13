import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CommonResponse, SpringPage, ResourceItemResponse, ResourceItemCreateRequest } from '@/lib/types';

export function useResourcesByFacility(facilityId: string, page = 0, size = 20) {
    return useQuery({
        queryKey: ['resources', facilityId, page, size],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<ResourceItemResponse>>>(
                `/api/v1/resources/facility/${facilityId}`,
                { params: { page, size } }
            );
            return data.data ?? {
                content: [], totalElements: 0, totalPages: 0,
                size, number: page, first: true, last: true, empty: true,
            };
        },
        enabled: !!facilityId,
    });
}

export function useResource(resourceId: string) {
    return useQuery({
        queryKey: ['resource', resourceId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<ResourceItemResponse>>(`/api/v1/resources/${resourceId}`);
            return data.data;
        },
        enabled: !!resourceId,
    });
}

export function useCreateResource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: ResourceItemCreateRequest) => {
            const { data } = await api.post<CommonResponse<ResourceItemResponse>>('/api/v1/resources', request);
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['resources', variables.facilityId] });
        },
    });
}
