'use client';

import { useState } from 'react';
import { HIRA_SPECIALTIES, SYMPTOM_SPECIALTY_MAP } from '@/lib/hiraSpecialties';

interface HospitalSearchPanelProps {
    selectedCodes: string[];
    openNow: boolean;
    onSpecialtySelect: (codes: string[], label: string) => void;
    onClear: () => void;
    onOpenNowChange: (v: boolean) => void;
}

const SYMPTOMS = [
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

export default function HospitalSearchPanel({
    selectedCodes,
    openNow,
    onSpecialtySelect,
    onClear,
    onOpenNowChange,
}: HospitalSearchPanelProps) {
    const [mode, setMode] = useState<'symptom' | 'specialty'>('symptom');

    const handleSymptomClick = (symptomId: string, label: string) => {
        const codes = SYMPTOM_SPECIALTY_MAP[symptomId] ?? [];
        const currentLabel = codes.join(',') === selectedCodes.join(',');
        if (currentLabel) {
            onClear();
        } else {
            onSpecialtySelect(codes, label);
        }
    };

    const handleSpecialtyClick = (code: string) => {
        if (selectedCodes.includes(code)) {
            const next = selectedCodes.filter(c => c !== code);
            if (next.length === 0) {
                onClear();
            } else {
                onSpecialtySelect(next, next.join(','));
            }
        } else {
            const next = [...selectedCodes, code];
            onSpecialtySelect(next, next.join(','));
        }
    };

    return (
        <div className="border-b px-4 py-5" style={{ background: '#FFFBFB', borderColor: '#FDE8E8' }}>
            <div className="max-w-4xl mx-auto">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-[15px] font-semibold" style={{ color: '#18181B' }}>
                            어디가 불편하신가요?
                        </h2>
                        <p className="text-[12px] mt-0.5" style={{ color: '#A1A1AA' }}>
                            증상 또는 진료과를 선택해 주변 병원을 찾아보세요
                        </p>
                    </div>
                    {selectedCodes.length > 0 && (
                        <button
                            onClick={onClear}
                            className="text-[12px] px-3 py-1.5 rounded-lg"
                            style={{ background: '#FEE2E2', color: '#EF4444' }}
                        >
                            선택 해제
                        </button>
                    )}
                </div>

                {/* 모드 탭 */}
                <div
                    className="flex gap-1 p-1 rounded-xl mb-4 w-fit"
                    style={{ background: '#F4F4F5' }}
                >
                    <button
                        onClick={() => setMode('symptom')}
                        className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
                        style={{
                            background: mode === 'symptom' ? '#fff' : 'transparent',
                            color: mode === 'symptom' ? '#18181B' : '#71717A',
                            boxShadow: mode === 'symptom' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >
                        증상으로 찾기
                    </button>
                    <button
                        onClick={() => setMode('specialty')}
                        className="px-4 py-1.5 rounded-lg text-[13px] font-medium"
                        style={{
                            background: mode === 'specialty' ? '#fff' : 'transparent',
                            color: mode === 'specialty' ? '#18181B' : '#71717A',
                            boxShadow: mode === 'specialty' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >
                        진료과로 찾기
                    </button>
                </div>

                {/* 증상 모드 */}
                {mode === 'symptom' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {SYMPTOMS.map(symptom => {
                            const codes = SYMPTOM_SPECIALTY_MAP[symptom.id] ?? [];
                            const isSelected = codes.length > 0 &&
                                codes.every(c => selectedCodes.includes(c)) &&
                                selectedCodes.length === codes.length;
                            return (
                                <button
                                    key={symptom.id}
                                    onClick={() => handleSymptomClick(symptom.id, symptom.label)}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                                    style={{
                                        background: isSelected ? '#FEF2F2' : '#fff',
                                        border: isSelected ? '2px solid #EF4444' : '1px solid #F4F4F5',
                                        boxShadow: isSelected ? '0 0 0 3px #EF444420' : '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <span className="text-2xl leading-none">{symptom.icon}</span>
                                    <span
                                        className="text-[12px] font-medium text-center leading-tight"
                                        style={{ color: isSelected ? '#EF4444' : '#52525B' }}
                                    >
                                        {symptom.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 진료과 모드 */}
                {mode === 'specialty' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {HIRA_SPECIALTIES.map(spec => {
                            const isSelected = selectedCodes.includes(spec.code);
                            return (
                                <button
                                    key={spec.code}
                                    onClick={() => handleSpecialtyClick(spec.code)}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                                    style={{
                                        background: isSelected ? '#FEF2F2' : '#fff',
                                        border: isSelected ? '2px solid #EF4444' : '1px solid #F4F4F5',
                                        boxShadow: isSelected ? '0 0 0 3px #EF444420' : '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <span className="text-xl leading-none">{spec.icon}</span>
                                    <span
                                        className="text-[11px] font-medium text-center leading-tight"
                                        style={{ color: isSelected ? '#EF4444' : '#52525B' }}
                                    >
                                        {spec.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 영업중 토글 */}
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #FDE8E8' }}>
                    <span className="text-[13px] font-medium" style={{ color: '#52525B' }}>
                        현재 진료 중인 병원만
                    </span>
                    <button
                        onClick={() => onOpenNowChange(!openNow)}
                        className="relative w-11 h-6 rounded-full"
                        style={{ background: openNow ? '#EF4444' : '#D4D4D8' }}
                        aria-label="영업중 필터"
                    >
                        <span
                            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                            style={{ transform: openNow ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                    </button>
                </div>

                <p className="mt-3 text-[11px] text-center" style={{ color: '#A1A1AA' }}>
                    ⚠️ 이 정보는 참고용이며 정확한 진단은 의사에게 문의하세요.
                </p>
            </div>
        </div>
    );
}
