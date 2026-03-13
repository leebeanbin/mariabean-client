'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFacility, useUpdateFacilityMedical } from '@/hooks/useFacilities';
import { useToast } from '@/components/ui/Toast';
import { HIRA_SPECIALTIES } from '@/lib/hiraSpecialties';
import { HiOutlineArrowLeft, HiOutlineHeart } from 'react-icons/hi2';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
    MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일',
};
type DayKey = typeof DAYS[number];
interface DaySchedule { closed: boolean; open: string; close: string; }

export default function FacilityMedicalPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: facility, isLoading } = useFacility(id);
    const updateMedical = useUpdateFacilityMedical();
    const toast = useToast();

    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(
        Object.fromEntries(DAYS.map(d => [
            d, { closed: d === 'SUN', open: '09:00', close: '18:00' },
        ])) as Record<DayKey, DaySchedule>
    );

    useEffect(() => {
        if (!facility) return;
        if (facility.specialties?.length) setSelectedCodes(facility.specialties);
        const opHours = facility.metadata?.operatingHours as Record<string, { open: string; close: string } | null> | undefined;
        if (opHours) {
            setSchedule(prev => {
                const next = { ...prev };
                DAYS.forEach(d => {
                    const entry = opHours[d];
                    next[d] = entry ? { closed: false, open: entry.open, close: entry.close }
                                    : { ...next[d], closed: true };
                });
                return next;
            });
        }
    }, [facility]);

    const toggleCode = (code: string) =>
        setSelectedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

    const updateDay = (day: DayKey, field: keyof DaySchedule, value: string | boolean) =>
        setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const handleSave = async () => {
        const operatingHours = Object.fromEntries(
            DAYS.map(d => [d, schedule[d].closed ? null : { open: schedule[d].open, close: schedule[d].close }])
        ) as Record<string, { open: string; close: string } | null>;
        try {
            await updateMedical.mutateAsync({ id, specialties: selectedCodes, operatingHours });
            toast.success('저장되었습니다.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
            </div>
        );
    }

    if (!facility) return null;

    return (
        <div className="space-y-5">
            {/* Context bar */}
            <h1 className="sr-only">진료과 · 운영시간 설정</h1>
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-black/[0.04]"
                    >
                        <HiOutlineArrowLeft className="w-4 h-4" style={{ color: '#52525B' }} />
                    </button>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <HiOutlineHeart className="w-4 h-4" style={{ color: '#52525B' }} />
                    </div>
                    <div className="text-[13px] min-w-0">
                        <span className="truncate" style={{ color: '#71717A' }}>{facility.name}</span>
                        <span className="mx-1.5" style={{ color: '#D4D4D8' }}>·</span>
                        <span className="font-semibold" style={{ color: '#18181B' }}>진료과 · 운영시간</span>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={updateMedical.isPending}
                    className="btn-primary disabled:opacity-50"
                >
                    {updateMedical.isPending ? '저장 중...' : '저장'}
                </button>
            </div>

            {/* 진료과 선택 */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium" style={{ color: '#52525B' }}>진료과</p>
                    {selectedCodes.length > 0 && (
                        <button
                            onClick={() => setSelectedCodes([])}
                            className="text-[11px]"
                            style={{ color: '#A1A1AA' }}
                        >
                            전체 해제
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1">
                    {HIRA_SPECIALTIES.map(spec => {
                        const isSelected = selectedCodes.includes(spec.code);
                        return (
                            <button
                                key={spec.code}
                                onClick={() => toggleCode(spec.code)}
                                className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
                                style={isSelected
                                    ? { background: '#18181B', color: '#FAFAFA' }
                                    : { color: '#71717A' }
                                }
                                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}
                            >
                                {spec.name}
                            </button>
                        );
                    })}
                </div>
                {selectedCodes.length > 0 && (
                    <p className="text-[11px]" style={{ color: '#A1A1AA' }}>
                        {selectedCodes.length}개 선택됨 — {selectedCodes.map(c => HIRA_SPECIALTIES.find(s => s.code === c)?.name).filter(Boolean).join(', ')}
                    </p>
                )}
            </section>

            {/* 운영시간 */}
            <section className="space-y-2">
                <p className="text-[12px] font-medium" style={{ color: '#52525B' }}>운영시간</p>
                <div>
                    {DAYS.map((day, i) => (
                        <div
                            key={day}
                            className="flex items-center gap-3 py-2 text-[13px]"
                            style={{ borderBottom: i < DAYS.length - 1 ? '1px solid #F0F1F3' : undefined }}
                        >
                            <span
                                className="w-5 text-center text-[12px] font-semibold flex-shrink-0"
                                style={{ color: day === 'SAT' ? '#5E6AD2' : day === 'SUN' ? '#EF4444' : '#52525B' }}
                            >
                                {DAY_LABELS[day]}
                            </span>
                            <label className="flex items-center gap-1.5 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={schedule[day].closed}
                                    onChange={e => updateDay(day, 'closed', e.target.checked)}
                                />
                                <span className="text-[12px]" style={{ color: '#A1A1AA' }}>휴진</span>
                            </label>
                            {schedule[day].closed ? (
                                <span className="text-[12px]" style={{ color: '#D4D4D8' }}>–</span>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="time"
                                        value={schedule[day].open}
                                        onChange={e => updateDay(day, 'open', e.target.value)}
                                        className="text-[12px] px-2 py-1 rounded-md"
                                        style={{ border: '1px solid #DDDDE0', color: '#18181B', background: 'transparent', outline: 'none' }}
                                    />
                                    <span className="text-[11px]" style={{ color: '#A1A1AA' }}>–</span>
                                    <input
                                        type="time"
                                        value={schedule[day].close}
                                        onChange={e => updateDay(day, 'close', e.target.value)}
                                        className="text-[12px] px-2 py-1 rounded-md"
                                        style={{ border: '1px solid #DDDDE0', color: '#18181B', background: 'transparent', outline: 'none' }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
