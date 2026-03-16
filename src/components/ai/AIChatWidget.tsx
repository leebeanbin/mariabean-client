'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    HiOutlineXMark, HiOutlinePaperAirplane,
    HiOutlineBuildingOffice2, HiOutlineCalendarDays,
    HiOutlineMapPin, HiOutlineTrash, HiOutlineSparkles,
    HiOutlineArrowPath, HiOutlineBeaker, HiOutlinePhoto,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import AgentActionConfirm from './AgentActionConfirm';
import LoginPromptModal from '@/components/auth/LoginPromptModal';
import {
    AGENT_ACTIONS,
    detectIntent,
    runAction,
    buildContext,
    getFallbackMessage,
    getCancelReservationId,
    executeCancelReservation,
    callBeanLLM,
    type AgentActionType,
    type ChatHistoryEntry,
} from '@/lib/agentActions';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    streaming?: boolean;
}

interface PendingConfirm {
    action: string;
    details: string;
    onConfirm: () => Promise<void>;
}

type PendingRequest = {
    text: string;
    image: File | null;
};

const QUICK_ACTIONS = [
    { label: '주변 추천', icon: HiOutlineMapPin, msg: '주변에 뭐가 있어?' },
    { label: '예약 현황', icon: HiOutlineCalendarDays, msg: '내 예약 보여줘' },
    { label: '날씨', icon: HiOutlineBeaker, msg: '오늘 날씨 어때?' },
    { label: '병원 검색', icon: HiOutlineBuildingOffice2, msg: '내과 병원 찾아줘' },
];

const USER_QUICK_ACTIONS = [
    { label: '주변 추천', icon: HiOutlineMapPin, msg: '주변에 뭐가 있어?' },
    { label: '내 예약', icon: HiOutlineCalendarDays, msg: '내 예약 보여줘' },
    { label: '병원 검색', icon: HiOutlineBuildingOffice2, msg: '내과 병원 찾아줘' },
    { label: '날씨', icon: HiOutlineBeaker, msg: '오늘 날씨 어때?' },
];

const USER_ALLOWED_INTENTS: Set<AgentActionType> = new Set([
    AGENT_ACTIONS.GET_MY_RESERVATIONS,
    AGENT_ACTIONS.CHECK_AVAILABILITY,
    AGENT_ACTIONS.SEARCH_PLACES,
    AGENT_ACTIONS.SEARCH_HOSPITALS,
    AGENT_ACTIONS.RECOMMEND_NEARBY,
    AGENT_ACTIONS.GET_ROUTE,
    AGENT_ACTIONS.GET_WEATHER,
    AGENT_ACTIONS.BUILD_PLAN,
]);

let msgIdCounter = 0;
function createMsg(role: 'user' | 'assistant', content: string): Message {
    return { id: `msg-${++msgIdCounter}`, role, content, timestamp: new Date() };
}

const ADMIN_WELCOME_MSG = createMsg('assistant', '안녕하세요! MariBean AI 어시스턴트입니다.\n시설 관리, 예약 현황, 장소 검색 등을 도와드릴게요.');
const USER_WELCOME_MSG = createMsg('assistant', '안녕하세요! MariBean AI 어시스턴트입니다.\n예약 조회, 주변 추천, 병원/날씨 검색을 도와드릴게요.');

type AIChatWidgetProps = {
    mode?: 'admin' | 'user';
};

export default function AIChatWidget({ mode = 'admin' }: AIChatWidgetProps) {
    const welcomeMsg = mode === 'admin' ? ADMIN_WELCOME_MSG : USER_WELCOME_MSG;
    const quickActions = mode === 'admin' ? QUICK_ACTIONS : USER_QUICK_ACTIONS;
    const { requireAuth, showModal, setShowModal, isAuthenticated } = useRequireAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
    const [userLocation, setUserLocation] = useState<import('@/lib/locationService').UserLocation | null>(null);
    const [attachedImage, setAttachedImage] = useState<File | null>(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
    const [lastFailedRequest, setLastFailedRequest] = useState<PendingRequest | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const openButtonRef = useRef<HTMLButtonElement>(null);
    const streamTimersRef = useRef<Set<number>>(new Set());
    const focusTimerRef = useRef<number | null>(null);
    const isMobile = useMediaQuery('(max-width: 1023px)');
    const isIntentAllowed = useCallback((intent: AgentActionType | null) => {
        if (!intent) return true;
        if (mode === 'admin') return true;
        return USER_ALLOWED_INTENTS.has(intent);
    }, [mode]);

    // Build conversation history for multi-turn beanllm context
    const getChatHistory = useCallback((): ChatHistoryEntry[] => {
        return messages
            .filter(m => m.id !== welcomeMsg.id && !m.streaming)
            .slice(-8)
            .map(m => ({ role: m.role, content: m.content }));
    }, [messages, welcomeMsg.id]);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    useEffect(() => {
        if (!isOpen) return;
        if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = window.setTimeout(() => inputRef.current?.focus(), 300);
        return () => {
            if (focusTimerRef.current) {
                window.clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (attachedImagePreview) URL.revokeObjectURL(attachedImagePreview);
        };
    }, [attachedImagePreview]);

    useEffect(() => {
        return () => {
            streamTimersRef.current.forEach(timer => window.clearInterval(timer));
            streamTimersRef.current.clear();
        };
    }, []);

    // Request location when chat opens
    useEffect(() => {
        if (isOpen && !userLocation) {
            import('@/lib/locationService').then(({ getUserLocation }) => {
                getUserLocation()
                    .then(loc => setUserLocation(loc))
                    .catch(() => {}); // silently ignore
            });
        }
    }, [isOpen, userLocation]);

    // 모바일에서 열릴 때 body 스크롤 잠금
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, isOpen]);

    useEffect(() => {
        trackEvent(isOpen ? 'chat_open' : 'chat_close', { mode, isMobile });
    }, [isOpen, isMobile, mode]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                openButtonRef.current?.focus();
                return;
            }
            if (e.key !== 'Tab' || !isOpen) return;
            const dialog = document.querySelector('[data-ai-chat-dialog="true"]');
            if (!dialog) return;
            const focusable = Array.from(
                dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
            ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    const streamAssistantMessage = useCallback((text: string) => {
        const id = `msg-${++msgIdCounter}`;
        setMessages(prev => [...prev, { id, role: 'assistant', content: '', timestamp: new Date(), streaming: true }]);
        let i = 0;
        const interval = window.setInterval(() => {
            i += 3;
            setMessages(prev => prev.map(m => m.id === id ? { ...m, content: text.slice(0, i), streaming: i < text.length } : m));
            if (i >= text.length) {
                window.clearInterval(interval);
                streamTimersRef.current.delete(interval);
            }
        }, 18);
        streamTimersRef.current.add(interval);
    }, []);

    const analyzeImage = useCallback(async (file: File): Promise<string> => {
        try {
            trackEvent('vision_upload', { mode, fileName: file.name, fileSize: file.size });
            const formData = new FormData();
            formData.append('file', file);
            const lat = userLocation?.lat ?? 37.5665;
            const lng = userLocation?.lng ?? 126.978;
            const { data } = await api.post(
                `/api/v1/search/vision?lat=${lat}&lng=${lng}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 20000 },
            );
            const vision = data?.vision;
            const results = data?.results;
            let msg = '';
            if (vision?.locationDescription) msg += `📍 인식: ${vision.locationDescription}\n`;
            if (vision?.suggestedQuery) msg += `🔍 검색어: "${vision.suggestedQuery}"\n`;
            if (results?.results?.length) {
                msg += `\n검색 결과 ${results.results.length}개:\n`;
                results.results.slice(0, 3).forEach((r: { name: string; address?: string; rating?: number }, i: number) => {
                    msg += `${i + 1}. ${r.name}${r.address ? ` — ${r.address}` : ''}${r.rating ? ` ★${r.rating}` : ''}\n`;
                });
            }
            trackEvent('vision_success', { mode, resultCount: results?.results?.length ?? 0 });
            return msg || '이미지를 분석했지만 관련 장소를 찾지 못했습니다.';
        } catch {
            trackEvent('vision_fail', { mode });
            return '이미지 분석 중 오류가 발생했습니다. 다시 시도해 주세요.';
        }
    }, [mode, userLocation]);

    const attachImage = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) return;
        if (attachedImagePreview) URL.revokeObjectURL(attachedImagePreview);
        setAttachedImage(file);
        setAttachedImagePreview(URL.createObjectURL(file));
    }, [attachedImagePreview]);

    const clearAttachedImage = useCallback(() => {
        if (attachedImagePreview) URL.revokeObjectURL(attachedImagePreview);
        setAttachedImage(null);
        setAttachedImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
    }, [attachedImagePreview]);

    const handleSend = useCallback(async (override?: Partial<PendingRequest>) => {
        const userMsg = (override?.text ?? input).trim();
        const imageToSend = override?.image !== undefined ? override.image : attachedImage;
        if ((!userMsg && !imageToSend) || isLoading) return;

        // AI 기능은 로그인 필수
        if (!isAuthenticated) {
            setShowModal(true);
            return;
        }
        const imageFileName = imageToSend?.name;
        setInput('');
        if (imageToSend && userMsg) {
            setMessages(prev => [...prev, createMsg('user', `📷 이미지 + 메시지\n${userMsg}\n(${imageFileName})`)]);
        } else if (imageToSend) {
            setMessages(prev => [...prev, createMsg('user', `📷 이미지 분석 요청: ${imageFileName}`)]);
        } else {
            setMessages(prev => [...prev, createMsg('user', userMsg)]);
        }
        clearAttachedImage();
        setIsLoading(true);
        setLastFailedRequest(null);
        try {
            const context = { ...buildContext(), userLocation };
            const intent = userMsg ? detectIntent(userMsg) : null;
            const visionSummary = imageToSend ? await analyzeImage(imageToSend) : null;
            trackEvent('chat_send', {
                mode,
                hasText: Boolean(userMsg),
                hasImage: Boolean(imageToSend),
                intent: intent ?? 'none',
            });

            if (!isIntentAllowed(intent)) {
                streamAssistantMessage('현재 계정에서는 해당 관리 기능을 사용할 수 없어요. 예약 조회, 주변 추천, 검색 기능을 이용해 주세요.');
                trackEvent('chat_blocked_intent', { mode, intent: intent ?? 'none' });
                return;
            }

            // Destructive actions need confirmation first (safety gate)
            if (intent === AGENT_ACTIONS.CANCEL_RESERVATION) {
                const id = getCancelReservationId(userMsg);
                if (!id) {
                    streamAssistantMessage('취소할 예약 번호를 알려주세요.\n예시: "예약 3번 취소해줘"');
                } else {
                    setPendingConfirm({
                        action: '예약 취소',
                        details: `예약 #${id}을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                        onConfirm: async () => {
                            setPendingConfirm(null);
                            setIsLoading(true);
                            const result = await executeCancelReservation(id);
                            streamAssistantMessage(result);
                            setIsLoading(false);
                        },
                    });
                }
                return;
            }

            const history = getChatHistory();

            if (intent && userMsg) {
                // Structured handlers fetch real data → beanllm converts to natural language
                const rawData = await runAction(intent, userMsg, context);
                const mergedContext = [visionSummary ? `이미지 분석 결과:\n${visionSummary}` : null, rawData]
                    .filter(Boolean)
                    .join('\n\n');
                const response = await callBeanLLM(userMsg, context, mergedContext || null, history, mode);
                const finalResponse = response || getFallbackMessage(context);
                streamAssistantMessage(finalResponse);
                trackEvent('chat_response', { mode, source: 'intent', responseLen: finalResponse.length });
            } else if (userMsg) {
                // No recognized intent → let beanllm handle directly
                const imageContext = visionSummary ? `이미지 분석 결과:\n${visionSummary}` : null;
                const response = await callBeanLLM(userMsg, context, imageContext, history, mode);
                streamAssistantMessage(response || getFallbackMessage(context));
                trackEvent('chat_response', { mode, source: 'llm', responseLen: (response || '').length });
            } else {
                streamAssistantMessage(visionSummary || '이미지 분석을 완료했어요.');
                trackEvent('chat_response', { mode, source: 'vision_only', responseLen: (visionSummary || '').length });
            }
        } catch {
            setMessages(prev => [...prev, createMsg('assistant', '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.')]);
            setLastFailedRequest({ text: userMsg, image: imageToSend ?? null });
            trackEvent('chat_error_type', { mode, type: 'send_exception' });
        } finally {
            setIsLoading(false);
        }
    }, [input, attachedImage, isLoading, userLocation, mode, clearAttachedImage, getChatHistory, analyzeImage, isIntentAllowed, streamAssistantMessage]);

    const clearChat = () => {
        setMessages([createMsg('assistant', mode === 'admin'
            ? '대화가 초기화되었습니다. 무엇을 도와드릴까요?'
            : '대화가 초기화되었습니다. 예약/주변/병원 검색을 도와드릴게요.'
        )]);
    };

    const showInitialState = messages.length <= 1;

    /* ── 채팅 패널 공통 내용 ── */
    const chatContent = (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#18181B' }}>
            {/* Header */}
            <div
                className="px-5 py-4 flex items-center gap-3.5 flex-shrink-0 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #18181B 0%, #1E293B 100%)' }}
            >
                <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #5E6AD2 0%, transparent 70%)' }}
                />
                <div className="relative">
                    <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)' }}
                    >
                        <HiOutlineSparkles className="w-5 h-5 text-white" />
                    </div>
                    <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: '#22C55E', borderColor: '#18181B' }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white tracking-tight">MariBean AI</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>운영 어시스턴트 · 항상 온라인</p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={clearChat}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        title="대화 초기화"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                    </button>
                    <button
                        ref={closeButtonRef}
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        aria-label="AI 챗 닫기"
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
                style={{ background: '#F9F9FB' }}
            >
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)' }}
                            >
                                <HiOutlineSparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div
                                className="px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                                style={msg.role === 'user'
                                    ? {
                                        background: 'linear-gradient(135deg, #5E6AD2 0%, #5B73F0 100%)',
                                        color: '#fff',
                                        borderRadius: '16px 16px 4px 16px',
                                        boxShadow: '0 2px 8px rgba(94,106,210,0.2)',
                                    }
                                    : {
                                        background: '#FFFFFF',
                                        color: '#27272A',
                                        border: '1px solid #E8EBF0',
                                        borderRadius: '16px 16px 16px 4px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }
                                }
                            >
                                <MessageContent content={msg.content} />
                            </div>
                            <p className="text-[10px] mt-1 px-1" style={{ color: '#A1A1AA' }}>
                                {formatTime(msg.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}

                {pendingConfirm && (
                    <AgentActionConfirm
                        action={pendingConfirm.action}
                        details={pendingConfirm.details}
                        onConfirm={pendingConfirm.onConfirm}
                        onCancel={() => {
                            setPendingConfirm(null);
                            streamAssistantMessage('취소 요청을 중단했습니다.');
                        }}
                    />
                )}

                {isLoading && (
                    <div className="flex gap-2.5">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)' }}
                        >
                            <HiOutlineSparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div
                            className="px-4 py-3 flex items-center gap-1"
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E8EBF0',
                                borderRadius: '16px 16px 16px 4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                        >
                            {[0, 1, 2].map(i => (
                                <span
                                    key={i}
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        background: '#A1A1AA',
                                        animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {lastFailedRequest && !isLoading && (
                    <div className="mx-1 rounded-xl p-3" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                        <p className="text-[12px] font-semibold" style={{ color: '#9A3412' }}>
                            요청 전송에 실패했어요
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#C2410C' }}>
                            네트워크 상태를 확인하고 다시 시도해 주세요.
                        </p>
                        <div className="mt-2">
                            <button
                                onClick={() => {
                                    trackEvent('chat_retry', { mode, hasImage: Boolean(lastFailedRequest.image), hasText: Boolean(lastFailedRequest.text) });
                                    handleSend(lastFailedRequest);
                                }}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                                style={{ background: '#EA580C', color: '#fff' }}
                            >
                                마지막 요청 다시 시도
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            {showInitialState && (
                <div className="px-4 pb-2 pt-1 flex gap-2 flex-shrink-0" style={{ background: '#F9F9FB' }}>
                    {quickActions.map(({ label, icon: Icon, msg }) => (
                        <button
                            key={label}
                            onClick={() => {
                                trackEvent('chat_quick_action', { mode, label });
                                handleSend({ text: msg, image: null });
                            }}
                            className="flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl transition-all active:scale-95"
                            style={{ background: '#fff', border: '1px solid #E8EBF0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0F0FF' }}>
                                <Icon className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                            </div>
                            <span className="text-[11px] font-semibold" style={{ color: '#52525B' }}>{label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* 비로그인 유도 배너 */}
            {!isAuthenticated && (
                <button
                    onClick={() => setShowModal(true)}
                    className="mx-3 mb-2 flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl w-[calc(100%-24px)] text-left transition-opacity active:opacity-70"
                    style={{ background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)' }}
                >
                    <HiOutlineSparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#5E6AD2' }}>
                        로그인하면 AI 요약·인용·개인 메모가 활성화돼요
                    </span>
                </button>
            )}

            {/* Input */}
            <div className="px-3 py-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #E8EBF0', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                {attachedImage && attachedImagePreview && (
                    <div
                        className="mb-2 rounded-xl p-2 flex items-center gap-2"
                        style={{ border: '1px solid #E8EBF0', background: '#FAFAFB' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={attachedImagePreview}
                            alt="첨부 이미지 미리보기"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold truncate" style={{ color: '#27272A' }}>
                                {attachedImage.name}
                            </p>
                            <p className="text-[10px]" style={{ color: '#A1A1AA' }}>
                                텍스트와 함께 전송할 수 있어요
                            </p>
                        </div>
                        <button
                            onClick={clearAttachedImage}
                            className="w-7 h-7 rounded-md flex items-center justify-center"
                            style={{ background: '#F4F4F5', color: '#71717A' }}
                            aria-label="첨부 이미지 제거"
                        >
                            <HiOutlineXMark className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    {/* 이미지 첨부 버튼 */}
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isLoading}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                        style={{ background: '#F4F4F5' }}
                        title="사진으로 장소 찾기"
                    >
                        <HiOutlinePhoto className="w-4 h-4" style={{ color: '#71717A' }} />
                    </button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) attachImage(file);
                            e.target.value = '';
                        }}
                    />
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            maxLength={500}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                            placeholder={attachedImage ? '이미지와 함께 보낼 메시지를 입력하세요...' : '무엇이든 물어보세요...'}
                            aria-label="AI 채팅 입력"
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 rounded-xl text-[13px] transition-all disabled:opacity-60"
                            style={{
                                background: '#F4F4F5',
                                border: '1.5px solid transparent',
                                color: '#27272A',
                                outline: 'none',
                            }}
                            onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#5E6AD2'; }}
                            onBlur={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.borderColor = 'transparent'; }}
                        />
                    </div>
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || (!input.trim() && !attachedImage)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
                        style={{
                            background: !isLoading && (input.trim() || attachedImage)
                                ? 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)'
                                : '#F4F4F5',
                            boxShadow: !isLoading && (input.trim() || attachedImage) ? '0 3px 10px rgba(94,106,210,0.35)' : 'none',
                        }}
                    >
                        {isLoading ? (
                            <HiOutlineArrowPath className="w-4 h-4 animate-spin" style={{ color: '#A1A1AA' }} />
                        ) : (
                            <HiOutlinePaperAirplane
                                className="w-4 h-4 transition-colors -rotate-45"
                                style={{ color: input.trim() ? '#fff' : '#A1A1AA' }}
                            />
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-center mt-2" style={{ color: '#A1A1AA' }}>
                    MariBean AI · 시설 및 예약 관리 어시스턴트
                </p>
            </div>
        </div>
    );

    /* ── 모바일: 풀스크린 바텀시트 ── */
    const mobileSheet = mounted && isMobile && isOpen ? createPortal(
        <div
            className="fixed inset-0 z-[60] flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
            <div
                className="flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="AI 어시스턴트 대화창"
                data-ai-chat-dialog="true"
                style={{
                    height: '88vh',
                    borderRadius: '20px 20px 0 0',
                    animation: 'sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                {chatContent}
            </div>
        </div>,
        document.body
    ) : null;

    /* ── 데스크탑: 우하단 팝오버 ── */
    const desktopPopover = !isMobile && isOpen && (
        <div
            className="fixed bottom-24 right-6 z-[55] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="AI 어시스턴트 대화창"
            data-ai-chat-dialog="true"
            style={{
                width: '380px',
                height: 'min(580px, calc(100vh - 120px))',
                borderRadius: '20px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
                animation: 'chatSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
        >
            {chatContent}
        </div>
    );

    return (
        <>
            {/* FAB */}
            <button
                ref={openButtonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed right-4 lg:right-6 z-[55] group bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] lg:bottom-6"
                aria-label="AI 어시스턴트 열기"
            >
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 relative"
                    style={{
                        background: isOpen
                            ? '#27272A'
                            : 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)',
                        boxShadow: isOpen
                            ? '0 4px 16px rgba(0,0,0,0.25)'
                            : '0 8px 28px rgba(94,106,210,0.45)',
                    }}
                >
                    <span className={`transition-all duration-300 ${isOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100'}`}>
                        {isOpen
                            ? <HiOutlineXMark className="w-6 h-6 text-white" />
                            : <HiOutlineSparkles className="w-6 h-6 text-white" />
                        }
                    </span>
                </div>
                {!isOpen && (
                    <span
                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white animate-pulse"
                        style={{ background: '#22C55E' }}
                    />
                )}
            </button>

            {mobileSheet}
            {desktopPopover}

            {/* 로그인 유도 모달 */}
            {showModal && (
                <LoginPromptModal
                    featureHint="AI 어시스턴트"
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}

function MessageContent({ content }: { content: string }) {
    const lines = content.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                if (line.match(/^\d+\.\s/)) {
                    const [numPart, ...rest] = line.split('. ');
                    return (
                        <div key={i} className="flex gap-2 py-0.5">
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                                style={{ background: 'rgba(94,106,210,0.1)', color: '#5E6AD2' }}
                            >
                                {numPart}
                            </span>
                            <span className="flex-1">{rest.join('. ')}</span>
                        </div>
                    );
                }
                if (line.startsWith('•')) {
                    return (
                        <div key={i} className="flex gap-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#5E6AD2' }} />
                            <span className="flex-1">{line.slice(1).trim()}</span>
                        </div>
                    );
                }
                if (line.startsWith('✅') || line.startsWith('📍') || line.startsWith('🕐')) {
                    return <div key={i} className="py-0.5">{line}</div>;
                }
                if (line.trim() === '') return <div key={i} className="h-1.5" />;
                return <div key={i}>{line}</div>;
            })}
        </>
    );
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

