'use client';

import { useState } from 'react';
import { HIRA_SPECIALTIES, SYMPTOM_SPECIALTY_MAP } from '@/lib/hiraSpecialties';
import {
    HiOutlineHeart, HiOutlineBuildingOffice2, HiOutlineUsers, HiOutlineBeaker,
    HiOutlineAcademicCap, HiOutlineClock, HiOutlineChevronRight,
} from 'react-icons/hi2';

// ─── Symptom data ─────────────────────────────────────────────────────────────

const SYMPTOM_ITEMS = [
    { id: 'headache',    label: '두통',      icon: '🤕' },
    { id: 'fever',       label: '발열',      icon: '🌡️' },
    { id: 'cough',       label: '기침·가래', icon: '😮‍💨' },
    { id: 'stomachache', label: '복통',      icon: '🤢' },
    { id: 'toothache',   label: '치통',      icon: '🦷' },
    { id: 'skin',        label: '피부',      icon: '🩺' },
    { id: 'eyes',        label: '눈·귀·코',  icon: '👁️' },
    { id: 'bone',        label: '관절·근육', icon: '🦴' },
    { id: 'mental',      label: '정신건강',  icon: '🧠' },
    { id: 'womens',      label: '여성건강',  icon: '🌸' },
    { id: 'kids',        label: '소아',      icon: '👶' },
    { id: 'heart',       label: '가슴통증',  icon: '❤️' },
];

// ─── Chip configs per category ────────────────────────────────────────────────

const OFFICE_CHIPS: { label: string; query: string }[][] = [
    [
        { label: '소회의실 (1-4인)',   query: '1-4인 소회의실' },
        { label: '중회의실 (5-10인)',  query: '5-10인 회의실' },
        { label: '대강의장 (10인+)',   query: '대형 강의실 회의실' },
    ],
    [
        { label: '프로젝터',    query: '프로젝터 있는 회의실' },
        { label: '화상회의',    query: '화상회의 가능 사무 공간' },
        { label: '화이트보드', query: '화이트보드 있는 회의실' },
        { label: '오늘 예약',  query: '오늘 예약 가능한 사무 공간' },
    ],
];

const COMMUNITY_CHIPS: { label: string; query: string }[][] = [
    [
        { label: '소모임 (10인↓)',  query: '소규모 모임 공간 10인 이하' },
        { label: '세미나·강의',     query: '세미나 강의실 커뮤니티' },
        { label: '파티·행사',       query: '파티 행사 대관 공간' },
        { label: '스터디·독서',     query: '스터디 독서 모임 공간' },
    ],
    [
        { label: '주방 구비',      query: '주방 있는 커뮤니티 공간' },
        { label: '악기 반입 가능', query: '악기 연주 가능 공간' },
        { label: '빔프로젝터',     query: '빔프로젝터 구비 커뮤니티' },
    ],
];

const SPORTS_CHIPS: { label: string; query: string }[][] = [
    [
        { label: '헬스장',       query: '헬스장 피트니스 센터' },
        { label: '수영장',       query: '수영장 수영 시설' },
        { label: '배드민턴',     query: '배드민턴 코트' },
        { label: '테니스',       query: '테니스 코트' },
        { label: '요가·필라테스', query: '요가 필라테스 스튜디오' },
        { label: '클라이밍',     query: '클라이밍 암벽 센터' },
    ],
    [
        { label: '오전 (06-12시)', query: '오전 운영 스포츠 시설' },
        { label: '오후 (12-18시)', query: '오후 운영 스포츠 시설' },
        { label: '저녁 (18시+)',   query: '저녁 야간 운동 시설' },
    ],
];

const LIBRARY_CHIPS: { label: string; query: string }[][] = [
    [
        { label: '개인 열람석',   query: '개인 열람석 도서관' },
        { label: '그룹 스터디룸', query: '그룹 스터디룸 도서관' },
        { label: '일반 열람실',   query: '일반 열람실 조용한 공간' },
    ],
    [
        { label: '24시간 운영', query: '24시간 운영 열람실 도서관' },
        { label: '콘센트 완비', query: '콘센트 노트북 가능 열람실' },
        { label: '조용한 공간', query: '조용한 무음 열람 공간' },
    ],
];

// ─── Category meta ────────────────────────────────────────────────────────────

const PANEL_META: Record<string, {
    title: string;
    subtitle: string;
    color: string;
    bg: string;
    icon: typeof HiOutlineBuildingOffice2;
    groups: { sectionLabel?: string; chips: { label: string; query: string }[] }[];
}> = {
    OFFICE: {
        title: '어떤 공간이 필요하세요?',
        subtitle: '인원·시설 조건으로 빠르게 찾기',
        color: '#5E6AD2', bg: 'rgba(94,106,210,0.08)',
        icon: HiOutlineBuildingOffice2,
        groups: [
            { sectionLabel: '인원 규모', chips: OFFICE_CHIPS[0] },
            { sectionLabel: '시설 조건', chips: OFFICE_CHIPS[1] },
        ],
    },
    COMMUNITY: {
        title: '어떤 모임 공간인가요?',
        subtitle: '용도와 특징으로 공간 찾기',
        color: '#22C55E', bg: '#F0FDF4',
        icon: HiOutlineUsers,
        groups: [
            { sectionLabel: '모임 유형', chips: COMMUNITY_CHIPS[0] },
            { sectionLabel: '공간 특징', chips: COMMUNITY_CHIPS[1] },
        ],
    },
    SPORTS: {
        title: '어떤 운동 시설인가요?',
        subtitle: '종목·시간대로 빠르게 찾기',
        color: '#EAB308', bg: '#FEFCE8',
        icon: HiOutlineBeaker,
        groups: [
            { sectionLabel: '운동 종목', chips: SPORTS_CHIPS[0] },
            { sectionLabel: '이용 시간대', chips: SPORTS_CHIPS[1] },
        ],
    },
    LIBRARY: {
        title: '어떤 공간을 찾으시나요?',
        subtitle: '공간 유형·특징으로 찾기',
        color: '#A855F7', bg: '#FAF5FF',
        icon: HiOutlineAcademicCap,
        groups: [
            { sectionLabel: '공간 유형', chips: LIBRARY_CHIPS[0] },
            { sectionLabel: '이용 조건', chips: LIBRARY_CHIPS[1] },
        ],
    },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryUtilityPanelProps {
    category: string;
    // hospital-specific
    selectedSpecialtyCodes: string[];
    openNow: boolean;
    onSpecialtySelect: (codes: string[]) => void;
    onSpecialtyClear: () => void;
    onOpenNowChange: (v: boolean) => void;
    // general
    onApplyQuery: (query: string, category?: string) => void;
}

// ─── Hospital sub-panel ───────────────────────────────────────────────────────

function HospitalPanel({
    selectedSpecialtyCodes, openNow,
    onSpecialtySelect, onSpecialtyClear, onOpenNowChange,
}: {
    selectedSpecialtyCodes: string[];
    openNow: boolean;
    onSpecialtySelect: (codes: string[]) => void;
    onSpecialtyClear: () => void;
    onOpenNowChange: (v: boolean) => void;
}) {
    const [mode, setMode] = useState<'symptom' | 'specialty'>('symptom');

    const handleSymptomClick = (symptomId: string) => {
        const codes = SYMPTOM_SPECIALTY_MAP[symptomId] ?? [];
        const isSelected = codes.length > 0 &&
            codes.every(c => selectedSpecialtyCodes.includes(c)) &&
            selectedSpecialtyCodes.length === codes.length;
        if (isSelected) onSpecialtyClear();
        else onSpecialtySelect(codes);
    };

    const handleSpecialtyClick = (code: string) => {
        if (selectedSpecialtyCodes.includes(code)) {
            const next = selectedSpecialtyCodes.filter(c => c !== code);
            next.length === 0 ? onSpecialtyClear() : onSpecialtySelect(next);
        } else {
            onSpecialtySelect([...selectedSpecialtyCodes, code]);
        }
    };

    return (
        <div className="pt-3 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div
                    className="flex gap-0.5 p-0.5 rounded-lg"
                    style={{ background: '#F4F4F5' }}
                >
                    {(['symptom', 'specialty'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className="px-3 py-1 rounded-md text-[12px] font-medium transition-all"
                            style={{
                                background: mode === m ? '#fff' : 'transparent',
                                color: mode === m ? '#18181B' : '#71717A',
                                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            {m === 'symptom' ? '증상' : '진료과'}
                        </button>
                    ))}
                </div>
                {selectedSpecialtyCodes.length > 0 && (
                    <button
                        onClick={onSpecialtyClear}
                        className="text-[11px] px-2.5 py-1 rounded-lg"
                        style={{ background: '#FEE2E2', color: '#EF4444' }}
                    >
                        선택 해제
                    </button>
                )}
            </div>

            {/* Symptom grid — fixed 4-col max for sidebar */}
            {mode === 'symptom' && (
                <div className="grid grid-cols-4 gap-1.5">
                    {SYMPTOM_ITEMS.map(symptom => {
                        const codes = SYMPTOM_SPECIALTY_MAP[symptom.id] ?? [];
                        const isSelected = codes.length > 0 &&
                            codes.every(c => selectedSpecialtyCodes.includes(c)) &&
                            selectedSpecialtyCodes.length === codes.length;
                        return (
                            <button
                                key={symptom.id}
                                onClick={() => handleSymptomClick(symptom.id)}
                                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                                style={{
                                    background: isSelected ? '#FEF2F2' : '#F9F9FB',
                                    border: isSelected ? '1.5px solid #EF4444' : '1px solid #F0F0F0',
                                }}
                            >
                                <span className="text-base leading-none">{symptom.icon}</span>
                                <span
                                    className="text-[10px] font-medium text-center leading-tight"
                                    style={{ color: isSelected ? '#EF4444' : '#52525B' }}
                                >
                                    {symptom.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Specialty grid — fixed 4-col max for sidebar */}
            {mode === 'specialty' && (
                <div className="grid grid-cols-4 gap-1.5">
                    {HIRA_SPECIALTIES.map(spec => {
                        const isSelected = selectedSpecialtyCodes.includes(spec.code);
                        return (
                            <button
                                key={spec.code}
                                onClick={() => handleSpecialtyClick(spec.code)}
                                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                                style={{
                                    background: isSelected ? '#FEF2F2' : '#F9F9FB',
                                    border: isSelected ? '1.5px solid #EF4444' : '1px solid #F0F0F0',
                                }}
                            >
                                <span className="text-base leading-none">{spec.icon}</span>
                                <span
                                    className="text-[10px] font-medium text-center leading-tight"
                                    style={{ color: isSelected ? '#EF4444' : '#52525B' }}
                                >
                                    {spec.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Open now toggle */}
            <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: '#F9F9FB', border: '1px solid #F0F0F0' }}
            >
                <div className="flex items-center gap-2">
                    <HiOutlineClock className="w-3.5 h-3.5" style={{ color: openNow ? '#EF4444' : '#A1A1AA' }} />
                    <span className="text-[12px] font-medium" style={{ color: '#52525B' }}>지금 진료 중인 곳만</span>
                </div>
                <button
                    onClick={() => onOpenNowChange(!openNow)}
                    className="relative w-9 h-5 rounded-full flex-shrink-0"
                    style={{ background: openNow ? '#EF4444' : '#D4D4D8', transition: 'background 0.2s' }}
                >
                    <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow"
                        style={{ transform: openNow ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }}
                    />
                </button>
            </div>

            <p className="text-[10px] text-center" style={{ color: '#D4D4D8' }}>
                참고용 정보이며 정확한 진단은 의사에게 문의하세요
            </p>
        </div>
    );
}

// ─── General sub-panel (multi-select) ────────────────────────────────────────

function GeneralPanel({
    meta, onApplyQuery, category,
}: {
    meta: typeof PANEL_META[string];
    onApplyQuery: (query: string, category?: string) => void;
    category: string;
}) {
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const allChips = meta.groups.flatMap(g => g.chips);

    const toggle = (chip: { label: string; query: string }) => {
        const next = selectedLabels.includes(chip.label)
            ? selectedLabels.filter(l => l !== chip.label)
            : [...selectedLabels, chip.label];
        const combined = allChips
            .filter(c => next.includes(c.label))
            .map(c => c.label)
            .join(' ');
        setSelectedLabels(next);
        if (combined) onApplyQuery(combined, category);
    };

    const clearAll = () => {
        setSelectedLabels([]);
        onApplyQuery('', category);
    };

    return (
        <div className="pt-3 space-y-3">
            {/* Selected count + clear */}
            {selectedLabels.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                        {selectedLabels.length}개 선택됨
                    </span>
                    <button onClick={clearAll} className="text-[11px]" style={{ color: '#A1A1AA' }}>
                        전체 해제
                    </button>
                </div>
            )}

            {meta.groups.map(group => (
                <div key={group.sectionLabel}>
                    {group.sectionLabel && (
                        <p className="text-[10px] font-semibold mb-1.5 tracking-wider uppercase" style={{ color: '#A1A1AA' }}>
                            {group.sectionLabel}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {group.chips.map(chip => {
                            const isActive = selectedLabels.includes(chip.label);
                            return (
                                <button
                                    key={chip.label}
                                    onClick={() => toggle(chip)}
                                    className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                                    style={isActive
                                        ? { background: meta.color, color: '#fff', boxShadow: `0 2px 6px ${meta.color}30` }
                                        : { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}20` }
                                    }
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CategoryUtilityPanel({
    category,
    selectedSpecialtyCodes, openNow,
    onSpecialtySelect, onSpecialtyClear, onOpenNowChange,
    onApplyQuery,
}: CategoryUtilityPanelProps) {
    const [expanded, setExpanded] = useState(true);

    const isHospital = category === 'HOSPITAL';
    const meta = PANEL_META[category];

    if (!isHospital && !meta) return null;

    const Icon = isHospital ? HiOutlineHeart : meta.icon;
    const color = isHospital ? '#EF4444' : meta.color;
    const bg = isHospital ? '#FEF2F2' : meta.bg;
    const title = isHospital ? '어디가 불편하신가요?' : meta.title;
    const subtitle = isHospital ? '증상 또는 진료과 선택' : meta.subtitle;

    return (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E4E4E7', background: '#fff' }}>
            {/* Header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="text-left">
                        <p className="text-[13px] font-semibold" style={{ color: '#18181B' }}>{title}</p>
                        <p className="text-[11px]" style={{ color: '#A1A1AA' }}>{subtitle}</p>
                    </div>
                </div>
                <HiOutlineChevronRight
                    className="w-4 h-4 flex-shrink-0 transition-transform"
                    style={{ color: '#D4D4D8', transform: expanded ? 'rotate(90deg)' : 'none' }}
                />
            </button>

            {/* Content */}
            {expanded && (
                <div className="px-3 pb-3 border-t" style={{ borderColor: '#F4F4F5' }}>
                    {isHospital ? (
                        <HospitalPanel
                            selectedSpecialtyCodes={selectedSpecialtyCodes}
                            openNow={openNow}
                            onSpecialtySelect={onSpecialtySelect}
                            onSpecialtyClear={onSpecialtyClear}
                            onOpenNowChange={onOpenNowChange}
                        />
                    ) : (
                        <GeneralPanel
                            meta={meta}
                            onApplyQuery={onApplyQuery}
                            category={category}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
