'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFacilities } from '@/hooks/useFacilities';
import { useHospitalSearch, usePlacesSearch } from '@/hooks/useSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDebounce } from '@/hooks/useDebounce';
import type { PlaceSearchResult, FacilityResponse, HospitalSearchResult } from '@/lib/types';
import HospitalCard from '@/components/hospital/HospitalCard';
import CategoryUtilityPanel from '@/components/facility/CategoryUtilityPanel';
import CategoryControlBar from '@/components/ui/CategoryControlBar';
import FacilityCard, { CATEGORY_META } from '@/components/facility/FacilityCard';
import {
    HiOutlineBuildingOffice2, HiOutlineMapPin, HiOutlineMagnifyingGlass,
    HiOutlineSparkles,
    HiOutlineClock,
    HiOutlineHeart,
} from 'react-icons/hi2';

const DISCOVERY_PROMPTS = [
    { icon: HiOutlineHeart, iconColor: '#EF4444', iconBg: '#FEF2F2', title: '가까운 병원 찾기', query: '지금 진료 중인 내과 병원', desc: '현재 위치 기반 영업 중인 병원 추천' },
    { icon: HiOutlineBuildingOffice2, iconColor: '#5E6AD2', iconBg: 'rgba(94,106,210,0.08)', title: '회의실 예약', query: '예약 가능한 대형 회의실', desc: '오늘 당장 예약 가능한 사무 공간' },
    { icon: HiOutlineSparkles, iconColor: '#A855F7', iconBg: '#FAF5FF', title: '증상 기반 추천', query: '두통이 심한데 어느 병원 가야 해', desc: 'AI가 증상 분석 후 진료과 추천' },
    { icon: HiOutlineClock, iconColor: '#EAB308', iconBg: '#FEFCE8', title: '야간 시설', query: '야간 운영 중인 의료시설', desc: '24시 또는 야간 영업 시설만 필터' },
];


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('전체');
    const [search, setSearch] = useState('');
    const [hospitalQuery, setHospitalQuery] = useState('');
    const [page, setPage] = useState(0);
    const [selectedSpecialtyCodes, setSelectedSpecialtyCodes] = useState<string[]>([]);
    const [openNow, setOpenNow] = useState(false);
    const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [submitted, setSubmitted] = useState(false); // tracks if user intentionally searched
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [mapRecentKeywords, setMapRecentKeywords] = useState<string[]>([]);

    const geo = useGeolocation(true);
    const debouncedHospitalQuery = useDebounce(hospitalQuery, 500);
    const isHospitalMode = selectedCategory === 'HOSPITAL';
    const currentInputValue = isHospitalMode ? hospitalQuery : search;
    const { data: placeSuggestions = [] } = usePlacesSearch(currentInputValue, 350);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasHospitalInput = debouncedHospitalQuery.length >= 2 || selectedSpecialtyCodes.length > 0;
    const useHospitalAPI = isHospitalMode && hasHospitalInput;
    const searchLat = placeCoords?.lat ?? geo.lat ?? (debouncedHospitalQuery.length >= 2 ? 37.5665 : null);
    const searchLng = placeCoords?.lng ?? geo.lng ?? (debouncedHospitalQuery.length >= 2 ? 126.9780 : null);
    const displayCategory = selectedCategory === '전체' ? undefined : selectedCategory;

    const { data: facilityData, isLoading: facilityLoading } = useFacilities(
        useHospitalAPI ? undefined : displayCategory, page, 12
    );
    const { data: hospitalData, isLoading: hospitalLoading } = useHospitalSearch(
        searchLat, searchLng,
        {
            specialties: debouncedHospitalQuery.length >= 2 ? [] : selectedSpecialtyCodes,
            query: debouncedHospitalQuery.length >= 2 ? debouncedHospitalQuery : undefined,
            openNow: openNow || undefined,
        },
        page, 12,
    );

    const facilities = facilityData?.content ?? [];
    const hospitals = hospitalData?.content ?? [];
    const isLoading = useHospitalAPI ? (searchLat !== null ? hospitalLoading : false) : facilityLoading;
    const activeQuery = (isHospitalMode ? hospitalQuery : search).trim();
    const isIdleView = !submitted && activeQuery.length === 0 && selectedCategory === '전체';

    // AI streaming insight
    const [streamedInsight, setStreamedInsight] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingDots, setThinkingDots] = useState(1);
    const [followUpInput, setFollowUpInput] = useState('');

    const aiInsightText = useMemo(() => {
        if (!activeQuery) return '';
        const addressLike = /(도|시|군|구|동|읍|면|리|로|길|\d{1,4}-\d{1,4})/.test(activeQuery);
        const placeLike = /(역|공원|병원|센터|도서관|학교|타워|몰)/.test(activeQuery);
        const count = useHospitalAPI ? hospitals.length : facilities.length;
        const intent = addressLike ? '주소 기반 장소 탐색으로 인식했어요.'
            : placeLike ? '장소명 기반 탐색으로 인식했어요.'
            : '키워드 기반 시설 탐색으로 인식했어요.';
        const result = isLoading ? '결과를 실시간으로 분석하고 있어요.'
            : count > 0 ? `조건에 맞는 시설 ${count}개를 찾았어요.`
            : '조건과 일치하는 시설을 찾지 못했어요.';
        const tip = addressLike ? '시설 목적이나 이용 조건을 추가하면 정확도가 올라가요.'
            : '운영 시간이나 조건을 함께 입력하면 추천 품질이 높아집니다.';
        return `${intent}\n${result}\n${tip}`;
    }, [activeQuery, hospitals.length, facilities.length, isLoading, useHospitalAPI]);

    useEffect(() => {
        if (!activeQuery) { setStreamedInsight(''); setIsThinking(false); return; }
        setIsThinking(true);
        setStreamedInsight('');
        const thinkTimer = window.setTimeout(() => {
            setIsThinking(false);
            let idx = 0;
            const streamTimer = window.setInterval(() => {
                idx += 3;
                setStreamedInsight(aiInsightText.slice(0, idx));
                if (idx >= aiInsightText.length) window.clearInterval(streamTimer);
            }, 12);
        }, 800);
        return () => window.clearTimeout(thinkTimer);
    }, [activeQuery, aiInsightText]);

    useEffect(() => {
        if (!isThinking) return;
        const timer = window.setInterval(() => setThinkingDots(d => d >= 3 ? 1 : d + 1), 280);
        return () => window.clearInterval(timer);
    }, [isThinking]);

    useEffect(() => {
        if (selectedCategory !== 'HOSPITAL') setSelectedSpecialtyCodes([]);
    }, [selectedCategory]);

    useEffect(() => {
        try {
            const recent = window.localStorage.getItem('book.recent.searches');
            if (recent) {
                const parsed = JSON.parse(recent) as string[];
                if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 8));
            }
            const mapRecent = window.localStorage.getItem('map.recent.keywords');
            if (mapRecent) {
                const parsed = JSON.parse(mapRecent) as string[];
                if (Array.isArray(parsed)) setMapRecentKeywords(parsed.slice(0, 8));
            }
        } catch {
            // noop
        }
    }, []);

    const registerRecentSearch = useCallback((q: string) => {
        const value = q.trim();
        if (!value) return;
        setRecentSearches(prev => {
            const next = [value, ...prev.filter(item => item !== value)].slice(0, 8);
            try {
                window.localStorage.setItem('book.recent.searches', JSON.stringify(next));
            } catch {
                // noop
            }
            return next;
        });
    }, []);

    const mixedKeywordSuggestions = useMemo(() => {
        const input = currentInputValue.trim().toLowerCase();
        const pool = [...recentSearches, ...mapRecentKeywords.filter(k => !recentSearches.includes(k))];
        return pool
            .filter(k => !input || k.toLowerCase().includes(input))
            .slice(0, 8);
    }, [currentInputValue, recentSearches, mapRecentKeywords]);

    const selectSuggestion = useCallback((place: PlaceSearchResult) => {
        const text = place.name ?? place.address ?? '';
        if (isHospitalMode) setHospitalQuery(text);
        else setSearch(text);
        if (place.latitude && place.longitude) setPlaceCoords({ lat: place.latitude, lng: place.longitude });
        registerRecentSearch(text);
        setShowSuggestions(false);
        setPage(0);
    }, [isHospitalMode, registerRecentSearch]);

    const applyQuery = useCallback((query: string, category?: string) => {
        const q = query.trim();
        if (!q) return;
        registerRecentSearch(q);
        if (category) setSelectedCategory(category);
        const isMedical = /(의료|병원|진료|약국|클리닉)/.test(q);
        if (isMedical || category === 'HOSPITAL') {
            setSelectedCategory('HOSPITAL');
            setHospitalQuery(q);
        } else {
            setSearch(q);
        }
        setSubmitted(true);
        setPage(0);
        inputRef.current?.blur();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, [registerRecentSearch]);

    const clearSearch = useCallback(() => {
        setSearch('');
        setHospitalQuery('');
        setPlaceCoords(null);
        setSelectedCategory('전체');
        setSelectedSpecialtyCodes([]);
        setSubmitted(false);
        setPage(0);
        setStreamedInsight('');
        setFollowUpInput('');
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const submitFollowUp = useCallback(() => {
        const next = followUpInput.trim();
        if (!next) return;
        applyQuery(next);
        setFollowUpInput('');
    }, [applyQuery, followUpInput]);

    const filteredFacilities = search
        ? facilities.filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            (f.address ?? '').includes(search)
          )
        : facilities;

    const displayItems = useHospitalAPI ? hospitals : filteredFacilities;
    const pageData = useHospitalAPI ? hospitalData : facilityData;
    const categoryControlItems = useMemo(
        () => [
            { key: '전체', label: '전체', color: '#5E6AD2' },
            ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
                key,
                label: meta.label,
                color: meta.color,
                icon: meta.icon,
            })),
        ],
        []
    );

    // ─── SEARCH / RESULTS VIEW ──────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col w-full" style={{ background: '#FCFCFD' }}>
            {/* Compact hero after first search */}
            <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-12 text-center transition-all duration-300 ${isIdleView ? 'flex-1 flex flex-col items-center justify-center py-8' : 'pt-4 pb-3'}`}>
                <div className="mx-auto w-full max-w-2xl">
                    <div className={`flex items-center justify-center transition-all duration-300 ${isIdleView ? 'mb-5 gap-3' : 'mb-3 gap-2'}`}>
                        <div
                            className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-white ${isIdleView ? 'w-14 h-14' : 'w-11 h-11'}`}
                            style={{ boxShadow: '0 6px 20px rgba(24,24,27,0.08)' }}
                        >
                            <Image
                                src="/icons/icon-512x512.png"
                                alt="Mariabean logo"
                                fill
                                sizes="56px"
                                className="object-contain"
                                priority
                            />
                        </div>
                        <span className={`${isIdleView ? 'text-[20px]' : 'text-[16px]'} font-semibold tracking-tight`} style={{ color: '#18181B' }}>
                            Mariabean
                        </span>
                    </div>

                    <h1 className={`${isIdleView ? 'text-[28px] sm:text-[34px] mb-2' : 'text-[22px] sm:text-[26px] mb-1'} font-bold tracking-tight transition-all duration-300`} style={{ color: '#18181B', letterSpacing: '-0.02em' }}>
                        어디를 찾고 계세요?
                    </h1>
                    <p className={`${isIdleView ? 'text-[14px] sm:text-[16px] mb-7' : 'text-[12px] sm:text-[14px] mb-4'} transition-all duration-300`} style={{ color: '#71717A' }}>
                        자연어로 검색하면 AI가 시설을 분석·추천해요
                    </p>

                    {/* Main Search Box */}
                    <div className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div
                                className="relative flex-1 rounded-2xl overflow-visible"
                                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1.5px solid #E4E4E7', background: '#fff' }}
                            >
                            <HiOutlineMagnifyingGlass
                                className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10"
                                style={{ color: '#A1A1AA' }}
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={isHospitalMode ? hospitalQuery : search}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (isHospitalMode || /(의료|병원|진료|클리닉)/.test(v)) {
                                        setSelectedCategory('HOSPITAL');
                                        setHospitalQuery(v);
                                        setPlaceCoords(null);
                                    } else {
                                        setSearch(v);
                                    }
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const v = (isHospitalMode ? hospitalQuery : search).trim();
                                        if (v) applyQuery(v);
                                    }
                                }}
                                placeholder="예: 강남 정형외과, 회의실 예약, 야간 병원..."
                                className="w-full pl-12 pr-14 py-4 text-[16px] bg-transparent outline-none"
                                style={{ color: '#18181B' }}
                            />
                            <button
                                onClick={() => {
                                    const v = (isHospitalMode ? hospitalQuery : search).trim();
                                    if (v) applyQuery(v);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: '#5E6AD2' }}
                            >
                                <HiOutlineMagnifyingGlass className="w-4 h-4 text-white" />
                            </button>

                            {showSuggestions && (placeSuggestions.length > 0 || mixedKeywordSuggestions.length > 0) && (
                                <div
                                    className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
                                    style={{ background: '#fff', border: '1px solid #E4E4E7', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                                >
                                    {mixedKeywordSuggestions.length > 0 && (
                                        <div className="px-4 pt-3 pb-2" style={{ borderBottom: placeSuggestions.length > 0 ? '1px solid #F4F4F5' : 'none' }}>
                                            <p className="text-[10px] font-semibold mb-2" style={{ color: '#A1A1AA' }}>최근/지도 추천 키워드</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {mixedKeywordSuggestions.map((keyword) => (
                                                    <button
                                                        key={`keyword-${keyword}`}
                                                        onMouseDown={() => applyQuery(keyword)}
                                                        className="px-2 py-1 rounded-full text-[11px]"
                                                        style={{ background: '#F4F4F5', color: '#52525B' }}
                                                    >
                                                        {keyword}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {placeSuggestions.slice(0, 6).map((place, i) => (
                                        <button
                                            key={place.placeId ?? i}
                                            onMouseDown={() => selectSuggestion(place)}
                                            className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50"
                                        >
                                            <HiOutlineMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#A1A1AA' }} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium truncate" style={{ color: '#18181B' }}>{place.name}</p>
                                                {place.address && place.address !== place.name && (
                                                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#71717A' }}>{place.address}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            </div>

                        </div>

                        <div className={`w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300 ${isIdleView ? 'opacity-100 max-h-[420px]' : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'}`}>
                            {DISCOVERY_PROMPTS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.title}
                                        onClick={() => applyQuery(item.query)}
                                        className="text-left p-4 rounded-2xl"
                                        style={{ background: '#fff', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.iconBg }}>
                                                <Icon className="w-4.5 h-4.5" style={{ color: item.iconColor }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold mb-0.5" style={{ color: '#18181B' }}>{item.title}</p>
                                                <p className="text-[11px] leading-snug" style={{ color: '#71717A' }}>{item.desc}</p>
                                                <p className="text-[11px] mt-1.5 font-medium truncate" style={{ color: '#5E6AD2' }}>
                                                    &ldquo;{item.query}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </div>

            {!isIdleView && (
                <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 pb-2">
                    <CategoryControlBar
                        items={categoryControlItems}
                        selectedKey={selectedCategory}
                        onSelect={key => {
                            setSelectedCategory(key);
                            setSubmitted(true);
                            setPage(0);
                        }}
                    />
                </div>
            )}

            {!isIdleView && (
                <div
                    className="w-full px-4 sm:px-6 md:px-8 lg:px-12 pt-3 pb-6 flex flex-col justify-start min-h-[calc(100dvh-260px)]"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
                        {/* Stream panel */}
                        <aside className="lg:col-span-4">
                            <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <HiOutlineSparkles className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                                    <p className="text-[12px] font-semibold" style={{ color: '#5E6AD2' }}>AI 스트림</p>
                                    <span
                                        className="ml-auto w-2 h-2 rounded-full"
                                        style={{
                                            background: geo.lat ? '#22C55E' : '#D4D4D8',
                                            boxShadow: geo.lat ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                                        }}
                                    />
                                </div>
                                <div className="text-[12px] leading-relaxed whitespace-pre-line mb-3" style={{ color: '#52525B', minHeight: '96px' }}>
                                    {isThinking ? `스트림 생성 중${'.'.repeat(thinkingDots)}` : (streamedInsight || '검색어를 입력하면 스트림이 시작됩니다.')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={followUpInput}
                                        onChange={e => setFollowUpInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitFollowUp(); }}
                                        placeholder="추가 요청 입력..."
                                        className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none"
                                        style={{ background: '#fff', border: '1px solid #E4E4E7', color: '#18181B' }}
                                    />
                                    <button
                                        onClick={submitFollowUp}
                                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                                        style={{ background: '#5E6AD2' }}
                                        aria-label="추가 요청 검색"
                                    >
                                        <HiOutlineMagnifyingGlass className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>

                            {selectedCategory !== '전체' && (
                                <div className="mt-3">
                                    <CategoryUtilityPanel
                                        category={selectedCategory}
                                        selectedSpecialtyCodes={selectedSpecialtyCodes}
                                        openNow={openNow}
                                        onSpecialtySelect={codes => { setSelectedSpecialtyCodes(codes); setPage(0); }}
                                        onSpecialtyClear={() => setSelectedSpecialtyCodes([])}
                                        onOpenNowChange={setOpenNow}
                                        onApplyQuery={(query, cat) => applyQuery(query, cat)}
                                    />
                                </div>
                            )}
                        </aside>

                        {/* Results */}
                        <section className="lg:col-span-8">
                            {/* Results header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[15px] font-bold" style={{ color: '#18181B' }}>
                                        {activeQuery ? `"${activeQuery}" 결과` : (CATEGORY_META[selectedCategory]?.label ?? '전체 시설')}
                                    </p>
                                    <p className="text-[12px] mt-0.5" style={{ color: '#A1A1AA' }}>
                                        {isLoading ? '검색 중...' : `${displayItems.length}개 시설`}
                                    </p>
                                </div>
                            </div>

                            {/* Loading skeleton */}
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="skeleton h-48 rounded-2xl" />
                                    ))}
                                </div>
                            ) : displayItems.length === 0 ? (
                                <div className="rounded-2xl flex flex-col items-center justify-center min-h-[360px] text-center" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                        style={{ background: '#F4F4F5' }}
                                    >
                                        <HiOutlineBuildingOffice2 className="w-7 h-7" style={{ color: '#D4D4D8' }} />
                                    </div>
                                    <p className="text-[15px] font-semibold mb-1.5" style={{ color: '#52525B' }}>결과가 없어요</p>
                                    <p className="text-[13px] mb-5" style={{ color: '#A1A1AA' }}>
                                        {isHospitalMode ? '위치 허용 또는 다른 검색어를 입력해보세요' : '다른 카테고리나 검색어를 시도해보세요'}
                                    </p>
                                    <button onClick={clearSearch} className="btn-primary text-[13px]">
                                        처음으로
                                    </button>
                                </div>
                            ) : useHospitalAPI ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(displayItems as HospitalSearchResult[]).map(h => (
                                        <HospitalCard key={h.placeId} hospital={h} />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(displayItems as FacilityResponse[]).map(f => (
                                        <FacilityCard key={f.id} facility={f} />
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {pageData && pageData.totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-8">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={pageData.first}
                                        className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-40 transition-colors hover:bg-gray-100"
                                        style={{ border: '1px solid #E4E4E7', background: '#fff', color: '#52525B' }}
                                    >이전</button>
                                    <span className="px-3 py-2 text-[13px]" style={{ color: '#71717A' }}>
                                        {pageData.number + 1} / {pageData.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={pageData.last}
                                        className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-40 transition-colors hover:bg-gray-100"
                                        style={{ border: '1px solid #E4E4E7', background: '#fff', color: '#52525B' }}
                                    >다음</button>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

