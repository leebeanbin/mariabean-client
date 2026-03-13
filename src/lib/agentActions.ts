import api from '@/lib/api';

export const AGENT_ACTIONS = {
    SEARCH_FACILITIES: 'search_facilities',
    SEARCH_HOSPITALS: 'search_hospitals',
    CREATE_RESERVATION: 'create_reservation',
    CANCEL_RESERVATION: 'cancel_reservation',
    GET_MY_RESERVATIONS: 'get_my_reservations',
    CHECK_AVAILABILITY: 'check_availability',
    SEARCH_PLACES: 'search_places',
} as const;

export type AgentActionType = (typeof AGENT_ACTIONS)[keyof typeof AGENT_ACTIONS];

export interface AgentAction {
    type: AgentActionType;
    label: string;
    description: string;
    destructive: boolean;
    params?: Record<string, unknown>;
}

export interface AgentContext {
    currentPage: string;
    facilityId?: string | null;
    resourceId?: string | null;
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
    if ((m.includes('병원') || m.includes('의원') || m.includes('진료')) && m.includes('검색')) return AGENT_ACTIONS.SEARCH_HOSPITALS;
    if (m.includes('예약') && (m.includes('취소') || m.includes('삭제'))) return AGENT_ACTIONS.CANCEL_RESERVATION;
    if (m.includes('예약') && (m.includes('하') || m.includes('생성') || m.includes('등록'))) return AGENT_ACTIONS.CREATE_RESERVATION;
    if (m.includes('예약') && (m.includes('목록') || m.includes('조회') || m.includes('현황') || m.includes('보여'))) return AGENT_ACTIONS.GET_MY_RESERVATIONS;
    if (m.includes('예약') && (m.includes('가능') || m.includes('빈') || m.includes('시간'))) return AGENT_ACTIONS.CHECK_AVAILABILITY;
    if ((m.includes('시설') || m.includes('공간')) && (m.includes('목록') || m.includes('조회') || m.includes('보여') || m.includes('현황'))) return AGENT_ACTIONS.SEARCH_FACILITIES;
    if (m.includes('장소') && m.includes('검색')) return AGENT_ACTIONS.SEARCH_PLACES;
    return null;
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

export async function runAction(intent: AgentActionType, msg: string, context: AgentContext): Promise<string> {
    switch (intent) {
        case AGENT_ACTIONS.SEARCH_FACILITIES: return handleFacilityList(msg);
        case AGENT_ACTIONS.GET_MY_RESERVATIONS: return handleReservationList();
        case AGENT_ACTIONS.CHECK_AVAILABILITY: return handleCheckAvailability(msg, context);
        case AGENT_ACTIONS.SEARCH_PLACES: return handlePlaceSearch(msg);
        case AGENT_ACTIONS.SEARCH_HOSPITALS: return handleHospitalSearch(msg);
        default: return '';
    }
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
    if (!resourceId) {
        return '가용 시간 조회를 위해 먼저 시설 상세 페이지에서 리소스를 선택해 주세요.';
    }
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

async function handleHospitalSearch(msg: string): Promise<string> {
    // 위치 기반 병원 검색 — 서울 기본 좌표 (사용자 위치 없을 때)
    const query = msg.replace(/병원|의원|진료|검색|해줘|해/g, '').trim() || '내과';
    try {
        const { data } = await api.get('/api/v1/search/hospitals', {
            params: { lat: 37.5665, lng: 126.9780, radiusKm: 3, textQuery: query, page: 0, size: 5 },
        });
        const results = data.data?.content ?? [];
        if (!results.length) return `"${query}" 주변 병원을 찾지 못했습니다.`;
        const list = results.map((h: { name: string; address: string; openNow?: boolean }, i: number) =>
            `${i + 1}. ${h.name} ${h.openNow === true ? '🟢영업중' : h.openNow === false ? '🔴영업종료' : ''}\n   📍 ${h.address}`
        ).join('\n');
        return `"${query}" 검색 결과:\n\n${list}\n\n💡 더 정확한 결과는 지도 페이지(/map)에서 위치 기반 검색을 이용하세요.`;
    } catch { return '병원 검색에 실패했습니다.'; }
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
        contextualTips.push('• 예약 가능한 시간 조회해줘');
    }
    if (context.currentPage.includes('/map')) {
        contextualTips.push('• 내과 병원 검색해줘');
    }

    const base = '이런 것들을 도와드릴 수 있어요:\n\n• 시설 목록 보여줘\n• 예약 현황 조회\n• 예약 3번 취소해줘\n• 코엑스 장소 검색해줘\n• 내과 병원 검색해줘\n• 예약 가능한 시간 조회해줘';
    return contextualTips.length > 0
        ? `${base}\n\n현재 페이지에서 바로:\n${contextualTips.join('\n')}`
        : base;
}
