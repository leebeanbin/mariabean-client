'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    HiOutlineXMark, HiOutlinePaperAirplane,
    HiOutlineBuildingOffice2, HiOutlineCalendarDays,
    HiOutlineMapPin, HiOutlineTrash, HiOutlineSparkles,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const FACILITY_CATEGORIES = ['HOSPITAL', 'OFFICE', 'COMMUNITY', 'SPORTS', 'LIBRARY', 'OTHER'] as const;

const QUICK_ACTIONS = [
    { label: '시설 현황', icon: HiOutlineBuildingOffice2, msg: '시설 목록 보여줘' },
    { label: '예약 현황', icon: HiOutlineCalendarDays, msg: '예약 현황 조회' },
    { label: '장소 검색', icon: HiOutlineMapPin, msg: '코엑스 장소 검색해줘' },
];

let msgIdCounter = 0;
function createMsg(role: 'user' | 'assistant', content: string): Message {
    return { id: `msg-${++msgIdCounter}`, role, content, timestamp: new Date() };
}

const WELCOME_MSG = createMsg('assistant', '안녕하세요! MariBean AI 어시스턴트입니다.\n시설 관리, 예약 현황, 장소 검색 등을 도와드릴게요.');

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isMobile = useMediaQuery('(max-width: 1023px)');

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    // 모바일에서 열릴 때 body 스크롤 잠금
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, isOpen]);

    const handleSend = useCallback(async (text?: string) => {
        const userMsg = (text ?? input).trim();
        if (!userMsg || isLoading) return;
        setInput('');
        const userMessage = createMsg('user', userMsg);
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        try {
            const response = await processUserMessage(userMsg);
            setMessages(prev => [...prev, createMsg('assistant', response)]);
        } catch {
            setMessages(prev => [...prev, createMsg('assistant', '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.')]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading]);

    const clearChat = () => {
        setMessages([createMsg('assistant', '대화가 초기화되었습니다. 무엇을 도와드릴까요?')]);
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
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
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
            </div>

            {/* Quick Actions */}
            {showInitialState && (
                <div className="px-4 pb-2 pt-1 flex gap-2 flex-shrink-0" style={{ background: '#F9F9FB' }}>
                    {QUICK_ACTIONS.map(({ label, icon: Icon, msg }) => (
                        <button
                            key={label}
                            onClick={() => handleSend(msg)}
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

            {/* Input */}
            <div className="px-3 py-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #E8EBF0', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                            placeholder="무엇이든 물어보세요..."
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
                        disabled={isLoading || !input.trim()}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
                        style={{
                            background: !isLoading && input.trim()
                                ? 'linear-gradient(135deg, #5E6AD2 0%, #7C3AED 100%)'
                                : '#F4F4F5',
                            boxShadow: !isLoading && input.trim() ? '0 3px 10px rgba(94,106,210,0.35)' : 'none',
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
            className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden"
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
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 group"
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

// ── API logic ──

async function processUserMessage(msg: string): Promise<string> {
    if (msg.includes('시설') && (msg.includes('목록') || msg.includes('조회') || msg.includes('보여') || msg.includes('현황'))) {
        return handleFacilityList(msg);
    }
    if (msg.includes('예약') && (msg.includes('목록') || msg.includes('조회') || msg.includes('현황') || msg.includes('보여'))) {
        return handleReservationList();
    }
    if (msg.includes('예약') && msg.includes('취소')) {
        return handleReservationCancel(msg);
    }
    if (msg.includes('장소') && msg.includes('검색')) {
        return handlePlaceSearch(msg);
    }
    return `이런 요청을 도와드릴 수 있어요:\n\n• 시설 목록 보여줘\n• 예약 현황 조회\n• 예약 3번 취소해줘\n• 코엑스 장소 검색해줘\n\n무엇을 도와드릴까요?`;
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

async function handleReservationList(): Promise<string> {
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

async function handleReservationCancel(msg: string): Promise<string> {
            const idMatch = msg.match(/(\d+)/);
            if (!idMatch) return '취소할 예약 번호를 알려주세요.\n예시: "예약 1번 취소해줘"';
            try {
                await api.post(`/api/v1/reservations/${idMatch[1]}/cancel`);
                return `✅ 예약 #${idMatch[1]}이 취소되었습니다.`;
            } catch { return `예약 #${idMatch[1]} 취소에 실패했습니다.`; }
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

function extractCategory(msg: string): string | null {
        if (msg.includes('의료') || msg.includes('병원')) return 'HOSPITAL';
        if (msg.includes('사무') || msg.includes('오피스')) return 'OFFICE';
        if (msg.includes('주민') || msg.includes('커뮤니티')) return 'COMMUNITY';
        if (msg.includes('체육') || msg.includes('운동')) return 'SPORTS';
        if (msg.includes('도서관')) return 'LIBRARY';
        return null;
}
