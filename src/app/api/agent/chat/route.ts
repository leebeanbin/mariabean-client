import { NextRequest, NextResponse } from 'next/server';

// Ollama 기본 주소: http://localhost:11434
// 다른 LLM 서버 사용 시 BEANLLM_API_URL 환경변수로 덮어쓰기
const BEANLLM_URL = process.env.BEANLLM_API_URL || 'http://localhost:11434';
const BEANLLM_MODEL = process.env.BEANLLM_MODEL || 'qwen2.5:7b';
const BEANLLM_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 500;   // 프롬프트 인젝션 및 비용 노출 방지
const MAX_HISTORY_TURNS = 6;       // history 슬라이싱 상한

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AgentChatBody {
    message: string;
    mode?: 'admin' | 'user';
    context: {
        currentPage: string;
        facilityId?: string | null;
        resourceId?: string | null;
        userLocation?: { lat: number; lng: number } | null;
    };
    dataContext?: string | null;   // pre-fetched structured data from action handlers
    history?: ChatMessage[];       // recent conversation turns
}

type AgentChatResponse = {
    ok: boolean;
    content: string;
    errorCode?: 'UNAUTHORIZED' | 'BAD_REQUEST' | 'UPSTREAM_ERROR' | 'TIMEOUT';
};

function buildSystemPrompt(
    context: AgentChatBody['context'],
    mode: AgentChatBody['mode'] = 'admin',
    dataContext?: string | null
): string {
    const pageHint = (() => {
        if (context.currentPage.includes('/facilities/') && context.facilityId) return `현재 "${context.facilityId}" 시설 상세 페이지 보는 중`;
        if (context.currentPage.includes('/book')) return '예약 페이지 이용 중';
        if (context.currentPage.includes('/my-reservations')) return '내 예약 목록 페이지 이용 중';
        if (context.currentPage.includes('/map')) return '지도 페이지 이용 중';
        if (context.currentPage.includes('/admin')) return '관리자 페이지 이용 중';
        return '메인 페이지 이용 중';
    })();

    const locationHint = context.userLocation
        ? `위도 ${context.userLocation.lat.toFixed(4)}, 경도 ${context.userLocation.lng.toFixed(4)}`
        : '서울 시청 기준 (위치 정보 없음)';

    const base = `당신은 MariBean 플랫폼의 AI 어시스턴트입니다.
MariBean은 의료 시설·운동 공간·사무실·도서관 등 다양한 시설을 예약할 수 있는 플랫폼입니다.

## 사용자 현황
- 현재 페이지: ${pageHint}
- 현재 위치: ${locationHint}${context.facilityId ? `\n- 시설 ID: ${context.facilityId}` : ''}

## 역할
- 시설 검색 및 안내
- 예약 현황 조회·취소 안내
- 주변 장소 추천 (카페·병원·음식점 등)
- 날씨 정보 제공
- 경로 안내 (차량·도보)
- 병원 검색 및 진료 안내
- 일정 플랜 제안

## 응답 규칙
- 항상 한국어로 친절하게 답변
- 간결하게 (300자 이내 권장), 이모지 적절히 사용
- 조회된 데이터가 있으면 해당 내용을 중심으로 답변
- 모르는 내용은 솔직하게 안내
- 현재 모드: ${mode}`;

    const modeGuard = mode === 'user'
        ? '\n- user 모드에서는 관리자 전용 작업(대량 관리/운영 변경/삭제)을 직접 실행하지 말고 조회/안내 중심으로 답변'
        : '';

    if (dataContext) {
        return `${base}${modeGuard}\n\n## 방금 조회된 데이터\n${dataContext}\n\n위 데이터를 바탕으로 사용자 질문에 자연스럽게 답변해 주세요.`;
    }
    return `${base}${modeGuard}`;
}

export async function POST(req: NextRequest) {
    // 인증 확인: Authorization 헤더 또는 쿠키의 accessToken 필요
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('accessToken')?.value;
    const hasAuth = !!authHeader?.startsWith('Bearer ') || !!cookieToken;
    if (!hasAuth) {
        const res: AgentChatResponse = {
            ok: false,
            content: '로그인이 필요한 서비스입니다.',
            errorCode: 'UNAUTHORIZED',
        };
        return NextResponse.json(res, { status: 401 });
    }

    let body: AgentChatBody;
    try {
        body = await req.json();
    } catch {
        const res: AgentChatResponse = {
            ok: false,
            content: '잘못된 요청 형식입니다.',
            errorCode: 'BAD_REQUEST',
        };
        return NextResponse.json(res, { status: 400 });
    }

    const { message, mode = 'admin', context, dataContext, history = [] } = body;
    if (!message?.trim()) {
        const res: AgentChatResponse = {
            ok: false,
            content: '메시지를 입력해 주세요.',
            errorCode: 'BAD_REQUEST',
        };
        return NextResponse.json(res, { status: 400 });
    }
    // 메시지 길이 제한 (프롬프트 인젝션 및 LLM 비용 노출 방지)
    if (message.length > MAX_MESSAGE_LENGTH) {
        const res: AgentChatResponse = {
            ok: false,
            content: `메시지가 너무 깁니다. ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`,
            errorCode: 'BAD_REQUEST',
        };
        return NextResponse.json(
            res,
            { status: 400 }
        );
    }

    const systemPrompt = buildSystemPrompt(context, mode, dataContext);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        // 최근 N턴만 포함 (시스템 프롬프트와 사용자 입력 역할 분리 유지)
        ...history.slice(-MAX_HISTORY_TURNS),
        { role: 'user', content: message },
    ];

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), BEANLLM_TIMEOUT_MS);

        const response = await fetch(`${BEANLLM_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: BEANLLM_MODEL,
                messages,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 600,   // Ollama 토큰 제한 (max_tokens 대신)
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const text = await response.text().catch(() => 'unknown error');
            throw new Error(`Ollama returned ${response.status}: ${text}`);
        }

        const data = await response.json();
        // Ollama: { message: { role, content } }
        // OpenAI 호환 서버: { content: "..." } or { choices: [{ message: { content } }] }
        const content: string =
            data?.message?.content ??
            data?.choices?.[0]?.message?.content ??
            data?.content ??
            '요청을 처리했지만 응답이 비어 있어요. 다시 시도해 주세요.';

        const res: AgentChatResponse = { ok: true, content };
        return NextResponse.json(res);
    } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        const message = isAbort
            ? 'AI 응답 시간이 초과됐어요. Ollama 서버가 실행 중인지 확인해 주세요.'
            : 'AI 서비스에 연결할 수 없어요. Ollama(port 11434)가 실행 중인지 확인해 주세요.';

        const res: AgentChatResponse = {
            ok: false,
            content: message,
            errorCode: isAbort ? 'TIMEOUT' : 'UPSTREAM_ERROR',
        };
        return NextResponse.json(res);
    }
}
