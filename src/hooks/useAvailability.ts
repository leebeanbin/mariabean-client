import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AvailabilityResponse } from '@/lib/types';

export function useAvailability(resourceItemId: string | null, date: string | null) {
    return useQuery<AvailabilityResponse>({
        queryKey: ['availability', resourceItemId, date],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/public/reservations/availability', {
                params: { resourceItemId, date },
            });
            return data.data;
        },
        enabled: !!resourceItemId && !!date,
        staleTime: 30_000,
    });
}
