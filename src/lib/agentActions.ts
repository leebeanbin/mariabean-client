import api from '@/lib/api';
import { getUserLocationOrDefault, type UserLocation } from './locationService';
import { getWeather, weatherToEmoji } from './weatherService';
import { getRoute, formatRouteMessage } from './routeService';

export const AGENT_ACTIONS = {
    SEARCH_FACILITIES: 'search_facilities',
    SEARCH_HOSPITALS: 'search_hospitals',
    CREATE_RESERVATION: 'create_reservation',
    CANCEL_RESERVATION: 'cancel_reservation',
    GET_MY_RESERVATIONS: 'get_my_reservations',
    CHECK_AVAILABILITY: 'check_availability',
    SEARCH_PLACES: 'search_places',
    RECOMMEND_NEARBY: 'recommend_nearby',
    GET_ROUTE: 'get_route',
    GET_WEATHER: 'get_weather',
    BUILD_PLAN: 'build_plan',
} as const;

export type AgentActionType = (typeof AGENT_ACTIONS)[keyof typeof AGENT_ACTIONS];

export interface AgentContext {
    currentPage: string;
    facilityId?: string | null;
    resourceId?: string | null;
    userLocation?: UserLocation | null;
}

export function buildContext(): AgentContext {
    if (typeof window === 'undefined') return { currentPage: '/' };
    const path = window.location.pathname;
    const facilityMatch = path.match(/\/facilities\/([^/]+)/);
    const resourceMatch = path.match(/\/facilities\/[^/]+\/([^/]+)/);
    return {
        currentPage: path,
        facilityId: facilityMatch?.[1] ?? null,
        resourceId: resourceMatch?.[1] ?? null,
    };
}

// ── Intent detection ──────────────────────────────────────────────────────────

export function detectIntent(msg: string): AgentActionType | null {
    const m = msg.toLowerCase();
    // Weather
    if (m.includes('날씨') || m.includes('기온') || m.includes('비 올') || m.includes('우산')) return AGENT_ACTIONS.GET_WEATHER;
    // Route
    if (m.includes('어떻게 가') || m.includes('경로') || m.includes('길 찾') || m.includes('가는 방법') || m.includes('몇 분') || m.includes('얼마나 걸')) return AGENT_ACTIONS.GET_ROUTE;
    // Plan
    if (m.includes('일정') || m.includes('플랜') || m.includes('계획') || m.includes('코스')) return AGENT_ACTIONS.BUILD_PLAN;
    // Nearby recommendation
    if (m.includes('주변') || m.includes('근처') || m.includes('가까운') || m.includes('추천')) return AGENT_ACTIONS.RECOMMEND_NEARBY;
    // Hospital search
    if ((m.includes('병원') || m.includes('의원') || m.includes('진료')) && (m.includes('검색') || m.includes('찾') || m.includes('알려'))) return AGENT_ACTIONS.SEARCH_HOSPITALS;
    // Reservation cancel
    if (m.includes('예약') && (m.includes('취소') || m.includes('삭제'))) return AGENT_ACTIONS.CANCEL_RESERVATION;
    // My reservations
    if (m.includes('예약') && (m.includes('목록') || m.includes('조회') || m.includes('현황') || m.includes('보여') || m.includes('내 예약'))) return AGENT_ACTIONS.GET_MY_RESERVATIONS;
    // Availability
    if (m.includes('예약') && (m.includes('가능') || m.includes('빈') || m.includes('시간'))) return AGENT_ACTIONS.CHECK_AVAILABILITY;
    // Facilities
    if ((m.includes('시설') || m.includes('공간')) && (m.includes('목록') || m.includes('조회') || m.includes('보여') || m.includes('현황'))) return AGENT_ACTIONS.SEARCH_FACILITIES;
    // Place search
    if (m.includes('장소') && m.includes('검색')) return AGENT_ACTIONS.SEARCH_PLACES;
    return null;
}

// ── Main action runner ────────────────────────────────────────────────────────

export async function runAction(intent: AgentActionType, msg: string, context: AgentContext): Promise<string> {
    switch (intent) {
        case AGENT_ACTIONS.SEARCH_FACILITIES: return handleFacilityList(msg);
        case AGENT_ACTIONS.GET_MY_RESERVATIONS: return handleReservationList();
        case AGENT_ACTIONS.CHECK_AVAILABILITY: return handleCheckAvailability(msg, context);
        case AGENT_ACTIONS.SEARCH_PLACES: return handlePlaceSearch(msg);
        case AGENT_ACTIONS.SEARCH_HOSPITALS: return handleHospitalSearch(msg, context);
        case AGENT_ACTIONS.RECOMMEND_NEARBY: return handleRecommendNearby(msg, context);
        case AGENT_ACTIONS.GET_ROUTE: return handleGetRoute(msg, context);
        case AGENT_ACTIONS.GET_WEATHER: return handleGetWeather(context);
        case AGENT_ACTIONS.BUILD_PLAN: return handleBuildPlan(msg, context);
        default: return '';
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

const FACILITY_CATEGORIES = ['HOSPITAL', 'OFFICE', 'COMMUNITY', 'SPORTS', 'LIBRARY', 'OTHER'] as const;

function extractCategory(msg: string): string | null {
    if (msg.includes('의료') || msg.includes('병원')) return 'HOSPITAL';
    if (msg.includes('사무') || msg.includes('오피스')) return 'OFFICE';
    if (msg.includes('주민') || msg.includes('커뮤니티')) return 'COMMUNITY';
    if (msg.includes('체육') || msg.includes('운동')) return 'SPORTS';
    if (msg.includes('도서관')) return 'LIBRARY';
    return null;
}

async function handleFacilityList(msg: string): Promise<string> {
    try {
        const category = extractCategory(msg);
        let facilities: { name: string; category: string; address?: string }[] = [];
        let totalElements = 0;
        if (category) {
            const { data } = await api.get('/api/v1/facilities', { params: { page: 0, size: 5, category } });
            facilities = data.data?.content ?? [];
            totalElements = data.data?.totalElements ?? 0;
        } else {
            const responses = await Promise.all(
                FACILITY_CATEGORIES.map(cat => api.get('/api/v1/facilities', { params: { page: 0, size: 2, category: cat } }))
            );
            facilities = responses.flatMap(res => res.data.data?.content ?? []).slice(0, 5);
            totalElements = facilities.length;
        }
        if (!facilities.length) return '등록된 시설이 없습니다.';
        const list = facilities.map((f, i) =>
            `${i + 1}. ${f.name} (${f.category})\n   📍 ${f.address || '주소 미등록'}`
        ).join('\n');
        return `총 ${totalElements}개 시설 중 최대 5개:\n\n${list}`;
    } catch { return '시설 목록을 불러오지 못했습니다.'; }
}

export async function handleReservationList(): Promise<string> {
    try {
        const { data } = await api.get('/api/v1/reservations', { params: { page: 0, size: 5, sort: 'createdAt,desc' } });
        const rd = data.data;
        if (!rd?.content?.length) return '예약 내역이 없습니다.';
        const list = rd.content.map((r: { id: number; facilityId: string; status: string; startTime: string }, i: number) =>
            `${i + 1}. #${String(r.id).padStart(4, '0')} · ${r.facilityId} · ${r.status}\n   🕐 ${r.startTime.replace('T', ' ').substring(0, 16)}`
        ).join('\n');
        return `최근 예약 ${rd.totalElements}건:\n\n${list}`;
    } catch { return '예약 목록을 불러오지 못했습니다.'; }
}

async function handleCheckAvailability(msg: string, context: AgentContext): Promise<string> {
    const resourceId = context.resourceId;
    if (!resourceId) return '가용 시간 조회를 위해 먼저 시설 상세 페이지에서 리소스를 선택해 주세요.';
    const today = new Date().toISOString().split('T')[0];
    try {
        const { data } = await api.get('/api/v1/public/reservations/availability', {
            params: { resourceItemId: resourceId, date: today },
        });
        const slots = data.data?.slots ?? [];
        const available = slots.filter((s: { available: boolean }) => s.available);
        if (!available.length) return `오늘(${today}) 예약 가능한 시간이 없습니다.`;
        const times = available.slice(0, 6).map((s: { startTime: string; endTime: string }) => `• ${s.startTime} ~ ${s.endTime}`).join('\n');
        return `오늘(${today}) 예약 가능한 시간 (${available.length}개):\n\n${times}${available.length > 6 ? '\n...외 더 있음' : ''}`;
    } catch { return '가용 시간 조회에 실패했습니다.'; }
}

async function handlePlaceSearch(msg: string): Promise<string> {
    const query = msg.replace(/장소|검색|해줘|해/g, '').trim();
    if (!query) return '검색할 장소명을 알려주세요.\n예시: "코엑스 장소 검색해줘"';
    try {
        const { data } = await api.get('/api/v1/facilities/places/search', { params: { query } });
        if (!data.data?.length) return `"${query}"에 대한 결과가 없습니다.`;
        const list = data.data.map((p: { name: string; address: string }, i: number) =>
            `${i + 1}. ${p.name}\n   📍 ${p.address}`
        ).join('\n');
        return `"${query}" 검색 결과:\n\n${list}`;
    } catch { return '장소 검색에 실패했습니다.'; }
}

async function handleHospitalSearch(msg: string, context: AgentContext): Promise<string> {
    const query = msg.replace(/병원|의원|진료|검색|해줘|해|알려줘|찾아줘/g, '').trim() || '내과';
    const loc = context.userLocation ?? await getUserLocationOrDefault();
    const isDefault = !context.userLocation;
    try {
        const { data } = await api.get('/api/v1/search/hospitals', {
            params: { lat: loc.lat, lng: loc.lng, radiusKm: 3, textQuery: query, page: 0, size: 5 },
        });
        const results = data.data?.content ?? [];
        if (!results.length) return `${isDefault ? '서울 중심 기준 ' : ''}"${query}" 주변 병원을 찾지 못했습니다.`;
        const locationNote = isDefault ? '📍 서울 시청 기준 (위치 권한을 허용하면 더 정확해요)\n\n' : '';
        const list = results.map((h: { name: string; address: string; openNow?: boolean }, i: number) =>
            `${i + 1}. ${h.name} ${h.openNow === true ? '🟢영업중' : h.openNow === false ? '🔴영업종료' : ''}\n   📍 ${h.address}`
        ).join('\n');
        return `${locationNote}"${query}" 검색 결과 (3km 내):\n\n${list}`;
    } catch { return '병원 검색에 실패했습니다.'; }
}

async function handleRecommendNearby(msg: string, context: AgentContext): Promise<string> {
    const loc = context.userLocation ?? await getUserLocationOrDefault();
    const isDefault = !context.userLocation;

    // Extract what to search for
    let query = '';
    if (msg.includes('카페')) query = '카페';
    else if (msg.includes('식당') || msg.includes('음식') || msg.includes('밥')) query = '맛집';
    else if (msg.includes('병원')) query = '병원';
    else if (msg.includes('약국')) query = '약국';
    else if (msg.includes('편의점')) query = '편의점';
    else if (msg.includes('주차')) query = '주차장';
    else query = '시설';

    try {
        const { data } = await api.get('/api/v1/public/agent/nearby', {
            params: { lat: loc.lat, lng: loc.lng, query, radius: 1500 },
        });
        const places: { name: string; address: string; latitude: number; longitude: number }[] = data.data ?? [];
        if (!places.length) {
            return `${isDefault ? '서울 시청 기준 ' : ''}주변에서 "${query}"을 찾지 못했습니다.`;
        }
        const locationNote = isDefault ? '📍 서울 시청 기준 (위치 권한 허용 시 더 정확)\n\n' : '📍 현재 위치 기준:\n\n';
        const list = places.slice(0, 5).map((p, i) =>
            `${i + 1}. ${p.name}\n   📍 ${p.address}`
        ).join('\n');
        return `${locationNote}${list}\n\n💡 "경로 찾아줘"라고 하시면 가는 방법도 알려드려요!`;
    } catch { return '주변 검색에 실패했습니다.'; }
}

async function handleGetRoute(msg: string, context: AgentContext): Promise<string> {
    const loc = context.userLocation ?? await getUserLocationOrDefault();

    // Extract destination from message or context
    const m = msg.replace(/어떻게 가|경로|길 찾|가는 방법|몇 분|얼마나 걸/g, '').trim();
    const mode = msg.includes('걷') || msg.includes('도보') ? 'walk' : 'car';

    // If on a facility page, use facility location
    if (context.facilityId) {
        try {
            const { data } = await api.get(`/api/v1/facilities/${context.facilityId}`);
            const facility = data.data;
            if (facility?.latitude && facility?.longitude) {
                const route = await getRoute(loc.lat, loc.lng, facility.latitude, facility.longitude, mode);
                if (route) {
                    return formatRouteMessage(route, facility.name || '시설');
                }
            }
        } catch { /* fall through */ }
    }

    // If no facility context, search for the destination
    if (m.length > 1) {
        try {
            const { data } = await api.get('/api/v1/facilities/places/search', { params: { query: m } });
            const places = data.data ?? [];
            if (places.length > 0) {
                const dest = places[0];
                const route = await getRoute(loc.lat, loc.lng, dest.latitude, dest.longitude, mode);
                if (route) return formatRouteMessage(route, dest.name);
            }
        } catch { /* fall through */ }
    }

    return '목적지를 알려주세요.\n예시: "강남역 어떻게 가?" 또는 시설 페이지에서 물어보세요.';
}

async function handleGetWeather(context: AgentContext): Promise<string> {
    const loc = context.userLocation ?? await getUserLocationOrDefault();
    const isDefault = !context.userLocation;

    const weather = await getWeather(loc.lat, loc.lng);
    if (!weather) {
        return '날씨 정보를 불러오지 못했습니다.\n(.env.local에 NEXT_PUBLIC_OPENWEATHER_KEY를 추가하면 날씨 기능이 활성화됩니다)';
    }

    const emoji = weatherToEmoji(weather.description);
    const locationNote = isDefault ? '서울 시청 기준' : weather.cityName;
    return `${emoji} ${locationNote} 현재 날씨:\n\n• 기온: ${weather.temp}°C (체감 ${weather.feelsLike}°C)\n• 날씨: ${weather.description}\n• 습도: ${weather.humidity}%\n• 풍속: ${weather.windSpeed}m/s${weather.temp < 5 ? '\n\n🧥 옷을 따뜻하게 입으세요!' : weather.temp > 30 ? '\n\n☀️ 더운 날씨입니다. 수분 섭취 잊지 마세요!' : ''}`;
}

async function handleBuildPlan(msg: string, context: AgentContext): Promise<string> {
    const loc = context.userLocation ?? await getUserLocationOrDefault();
    const isDefault = !context.userLocation;

    // Get nearby relevant places
    const categories = ['병원', '카페', '식당', '주차장'];

    try {
        const [weatherStr, nearbyResponses] = await Promise.all([
            handleGetWeather(context),
            Promise.all(categories.slice(0, 2).map(cat =>
                api.get('/api/v1/public/agent/nearby', {
                    params: { lat: loc.lat, lng: loc.lng, query: cat, radius: 800 },
                }).then(r => ({ cat, places: r.data.data ?? [] })).catch(() => ({ cat, places: [] }))
            ))
        ]);

        const locationNote = isDefault ? '📍 서울 시청 기준 플랜' : '📍 현재 위치 기준 플랜';
        let plan = `${locationNote}\n\n`;

        // Weather-based suggestion
        const weatherLine = weatherStr.split('\n')[0];
        plan += `${weatherLine}\n\n`;

        // Nearby suggestions
        for (const { cat, places } of nearbyResponses) {
            if (places.length > 0) {
                plan += `🏢 근처 ${cat}: ${places[0].name}\n   📍 ${places[0].address}\n`;
            }
        }

        // Facility-based suggestions
        if (context.facilityId) {
            plan += `\n💡 현재 시설 기반 추천:\n`;
            plan += `• 예약 가능한 시간을 확인해보세요\n`;
            plan += `• "가는 방법 알려줘"로 경로를 확인하세요`;
        } else {
            plan += `\n💡 더 자세한 플랜을 원하시면:\n`;
            plan += `• 특정 시설 페이지로 이동 후 다시 물어보세요\n`;
            plan += `• "강남 카페 추천해줘"처럼 구체적으로 물어보세요`;
        }

        return plan;
    } catch {
        return '플랜을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.';
    }
}

export function getCancelReservationId(msg: string): string | null {
    const match = msg.match(/(\d+)/);
    return match?.[1] ?? null;
}

export async function executeCancelReservation(reservationId: string): Promise<string> {
    try {
        await api.post(`/api/v1/reservations/${reservationId}/cancel`);
        return `✅ 예약 #${reservationId}이 취소되었습니다.`;
    } catch { return `예약 #${reservationId} 취소에 실패했습니다.`; }
}

export function getFallbackMessage(context: AgentContext): string {
    const contextualTips: string[] = [];
    if (context.currentPage.includes('/facilities/')) {
        contextualTips.push('• 가는 방법 알려줘');
        contextualTips.push('• 예약 가능한 시간 조회해줘');
        contextualTips.push('• 주변 카페 추천해줘');
    }
    if (context.currentPage.includes('/map')) {
        contextualTips.push('• 내과 병원 검색해줘');
        contextualTips.push('• 주변 추천해줘');
    }

    const base = `이런 것들을 도와드릴 수 있어요:\n\n• 주변 카페/병원/식당 추천해줘\n• 강남역 어떻게 가?\n• 오늘 날씨 어때?\n• 시설 목록 보여줘\n• 내 예약 보여줘\n• 예약 3번 취소해줘\n• 일정 플랜 짜줘`;
    return contextualTips.length > 0
        ? `${base}\n\n현재 페이지에서 바로:\n${contextualTips.join('\n')}`
        : base;
}
