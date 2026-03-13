import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CommonResponse, SpringPage, ReservationResponse, ReservationCreateRequest, WaitingInfoResponse } from '@/lib/types';

const EMPTY_PAGE: SpringPage<ReservationResponse> = {
    content: [], totalElements: 0, totalPages: 0, size: 20, number: 0,
    first: true, last: true, empty: true,
};

export function useAllReservations(page = 0, size = 20) {
    return useQuery({
        queryKey: ['reservations', page, size],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<SpringPage<ReservationResponse>>>('/api/v1/reservations', {
                params: { page, size, sort: 'createdAt,desc' },
            });
            return data.data ?? EMPTY_PAGE;
        },
    });
}

export function useReservation(reservationId: number) {
    return useQuery({
        queryKey: ['reservation', reservationId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<ReservationResponse>>(`/api/v1/reservations/${reservationId}`);
            return data.data;
        },
        enabled: !!reservationId,
    });
}

export function useCreateReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: ReservationCreateRequest) => {
            const { data } = await api.post<CommonResponse<ReservationResponse>>('/api/v1/reservations', request);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useCancelReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (reservationId: number) => {
            const { data } = await api.post<CommonResponse<ReservationResponse>>(`/api/v1/reservations/${reservationId}/cancel`);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useConfirmReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (reservationId: number) => {
            const { data } = await api.post<CommonResponse<ReservationResponse>>(`/api/v1/reservations/${reservationId}/confirm`);
            return data.data;
        },
        onSuccess: (_, reservationId) => {
            queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useRescheduleReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ reservationId, newStartTime, newEndTime }: { reservationId: number; newStartTime: string; newEndTime: string }) => {
            const { data } = await api.post<CommonResponse<ReservationResponse>>(`/api/v1/reservations/${reservationId}/reschedule`, {
                newStartTime,
                newEndTime,
            });
            return data.data;
        },
        onSuccess: (_, { reservationId }) => {
            queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useCallNext() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (resourceItemId: string) => {
            const { data } = await api.post<CommonResponse<ReservationResponse>>(
                `/api/v1/reservations/resource/${resourceItemId}/call-next`
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useWaitingInfo(reservationId: number, enabled = true) {
    return useQuery({
        queryKey: ['waitingInfo', reservationId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<WaitingInfoResponse>>(`/api/v1/reservations/${reservationId}/waiting`);
            return data.data;
        },
        enabled: !!reservationId && enabled,
        refetchInterval: 30000, // refresh every 30s
    });
}
