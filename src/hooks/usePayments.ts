import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CommonResponse, PaymentResponse, PaymentReadyRequest, PaymentApproveRequest } from '@/lib/types';

export function usePayment(paymentId: number) {
    return useQuery({
        queryKey: ['payment', paymentId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<PaymentResponse>>(`/api/v1/payments/${paymentId}`);
            return data.data;
        },
        enabled: !!paymentId,
    });
}

export function usePaymentByReservation(reservationId: number) {
    return useQuery({
        queryKey: ['payment', 'reservation', reservationId],
        queryFn: async () => {
            const { data } = await api.get<CommonResponse<PaymentResponse>>(`/api/v1/payments/reservation/${reservationId}`);
            return data.data;
        },
        enabled: !!reservationId,
        retry: false,
    });
}

export function useReadyPayment() {
    return useMutation({
        mutationFn: async (request: PaymentReadyRequest) => {
            const { data } = await api.post<CommonResponse<PaymentResponse>>('/api/v1/payments/ready', request);
            return data.data;
        },
    });
}

export function useApprovePayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: PaymentApproveRequest) => {
            const { data } = await api.post<CommonResponse<PaymentResponse>>('/api/v1/payments/approve', request);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
}

export function useCancelPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (paymentId: number) => {
            const { data } = await api.post<CommonResponse<PaymentResponse>>(`/api/v1/payments/${paymentId}/cancel`);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment'] });
        },
    });
}
