import api from '@/lib/api';

export interface RouteResult {
    mode: string;
    duration: string;
    durationSeconds: number;
    distance: string;
    distanceMeters: number;
    taxiFare?: number;
    tollFare?: number;
    estimated?: boolean;
}

export async function getRoute(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    mode: 'car' | 'walk' = 'car'
): Promise<RouteResult | null> {
    try {
        const { data } = await api.get('/api/v1/public/agent/route', {
            params: { originLat, originLng, destLat, destLng, mode },
        });
        return data.data as RouteResult;
    } catch {
        return null;
    }
}

export function formatRouteMessage(route: RouteResult, destName: string): string {
    const modeLabel = route.mode === 'walk' ? '도보' : '자동차';
    const estimated = route.estimated ? ' (예상)' : '';
    let msg = `🗺️ ${destName}까지 ${modeLabel} 경로${estimated}:\n`;
    msg += `• 소요 시간: ${route.duration}\n`;
    msg += `• 거리: ${route.distance}\n`;
    if (route.taxiFare && route.taxiFare > 0) {
        msg += `• 예상 택시비: ₩${route.taxiFare.toLocaleString()}\n`;
    }
    if (route.tollFare && route.tollFare > 0) {
        msg += `• 통행료: ₩${route.tollFare.toLocaleString()}\n`;
    }
    return msg.trim();
}
