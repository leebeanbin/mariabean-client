'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFacility } from '@/hooks/useFacilities';
import { useResource } from '@/hooks/useResources';
import { useAvailability } from '@/hooks/useAvailability';
import { useCreateReservation } from '@/hooks/useReservations';
import { useAuthStore } from '@/store/authStore';
import TimeSlotPicker from '@/components/booking/TimeSlotPicker';
import BookingStepIndicator from '@/components/booking/BookingStepIndicator';
import { useToast } from '@/components/ui/Toast';
import {
    HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlineClock,
    HiOutlineCheckCircle, HiOutlineUsers,
} from 'react-icons/hi2';

const STEPS = [
    { label: '날짜 선택' },
    { label: '시간 선택' },
    { label: '예약 확인' },
];

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

interface PageProps {
    params: Promise<{ facilityId: string; resourceId: string }>;
}

export default function ResourceBookPage({ params }: PageProps) {
    const { facilityId, resourceId } = use(params);
    const router = useRouter();
    const toast = useToast();
    const { isAuthenticated } = useAuthStore();

    const [step, setStep] = useState(0);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());
    const [selectedStart, setSelectedStart] = useState<string | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<string | null>(null);

    const { data: facility } = useFacility(facilityId);
    const { data: resource } = useResource(resourceId);
    const { data: availability, isLoading: avLoading } = useAvailability(resourceId, selectedDate);
    const createReservation = useCreateReservation();

    const handleTimeSelect = (start: string, end: string) => {
        setSelectedStart(start);
        setSelectedEnd(end);
    };

    const handleNext = () => {
        if (step === 0) { setStep(1); return; }
        if (step === 1) {
            if (!selectedStart) { toast.error('시간을 선택해주세요'); return; }
            if (!isAuthenticated) {
                // 로그인 후 돌아오도록 URL 저장
                router.push(`/login?returnUrl=/book/${facilityId}/${resourceId}`);
                return;
            }
            setStep(2);
        }
    };

    const handleConfirm = async () => {
        if (!selectedStart || !selectedEnd) return;
        const startTime = `${selectedDate}T${selectedStart}:00`;
        const endTime = `${selectedDate}T${selectedEnd}:00`;

        createReservation.mutate(
            { resourceItemId: resourceId, facilityId, startTime, endTime },
            {
                onSuccess: (data) => {
                    toast.success('예약이 완료되었습니다!');
                    router.push(`/booking-confirmation/${data?.id}`);
                },
                onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    toast.error(msg ?? '예약에 실패했습니다.');
                },
            }
        );
    };

    return (
        <div className="flex-1 flex flex-col w-full" style={{ background: '#FCFCFD' }}>
            {/* Nav */}
            <div className="sticky top-0 z-10 px-4 py-3.5" style={{ background: 'rgba(252,252,253,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E4E4E7' }}>
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <button
                        onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                    >
                        <HiOutlineArrowLeft className="w-5 h-5" style={{ color: '#52525B' }} />
                    </button>
                    <span className="font-semibold text-[15px]" style={{ color: '#18181B' }}>
                        {resource?.name ?? '예약'}
                    </span>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Step indicator */}
                <div className="flex justify-center mb-8">
                    <BookingStepIndicator steps={STEPS} currentStep={step} />
                </div>

                {/* Resource info */}
                {resource && (
                    <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: '#F0F0FF' }}>
                        <div className="flex-1">
                            <p className="font-semibold text-[14px]" style={{ color: '#18181B' }}>{resource.name}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: '#5E6AD2' }}>
                                {facility?.name} · 최대 {resource.limitCapacity}명
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <HiOutlineUsers className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                        </div>
                    </div>
                )}

                {/* Step 0: Date */}
                {step === 0 && (
                    <div>
                        <h2 className="text-[15px] font-bold mb-4" style={{ color: '#18181B' }}>
                            날짜를 선택하세요
                        </h2>
                        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                            <input
                                type="date"
                                value={selectedDate}
                                min={getTodayStr()}
                                onChange={e => { setSelectedDate(e.target.value); setSelectedStart(null); setSelectedEnd(null); }}
                                className="w-full text-[14px] px-4 py-3 rounded-xl"
                                style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                            />
                            {selectedDate && (
                                <p className="text-[12px] mt-3 text-center" style={{ color: '#71717A' }}>
                                    <HiOutlineCalendarDays className="inline w-3.5 h-3.5 mr-1 align-middle" />
                                    {new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 1: Time */}
                {step === 1 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[15px] font-bold" style={{ color: '#18181B' }}>시간을 선택하세요</h2>
                            <p className="text-[12px]" style={{ color: '#71717A' }}>
                                {new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        {avLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="skeleton h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <TimeSlotPicker
                                slots={availability?.slots ?? []}
                                selectedStart={selectedStart}
                                selectedEnd={selectedEnd}
                                onSelect={handleTimeSelect}
                            />
                        )}
                        {selectedStart && (
                            <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: '#F0F0FF' }}>
                                <HiOutlineClock className="w-4 h-4 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                                <p className="text-[13px] font-medium" style={{ color: '#5E6AD2' }}>
                                    {selectedStart} ~ {selectedEnd} 선택됨
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Confirm */}
                {step === 2 && (
                    <div>
                        <h2 className="text-[15px] font-bold mb-4" style={{ color: '#18181B' }}>예약 내용 확인</h2>
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E4E4E7' }}>
                            {[
                                { label: '시설', value: facility?.name ?? '-' },
                                { label: '공간', value: resource?.name ?? '-' },
                                { label: '날짜', value: new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) },
                                { label: '시간', value: `${selectedStart} ~ ${selectedEnd}` },
                            ].map(({ label, value }, i) => (
                                <div
                                    key={i}
                                    className="flex items-center px-5 py-3.5"
                                    style={{ borderBottom: i < 3 ? '1px solid #F4F4F5' : 'none', background: '#fff' }}
                                >
                                    <span className="text-[13px] w-14 flex-shrink-0" style={{ color: '#A1A1AA' }}>{label}</span>
                                    <span className="text-[14px] font-medium" style={{ color: '#18181B' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[12px] mt-4 text-center" style={{ color: '#A1A1AA' }}>
                            예약 후 관리자 확인을 통해 최종 확정됩니다
                        </p>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-8">
                    {step < 2 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && !selectedStart}
                            className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #5E6AD2, #7C3AED)', color: '#fff' }}
                        >
                            {step === 0 ? '다음 - 시간 선택' : !isAuthenticated ? '로그인 후 계속' : '다음 - 예약 확인'}
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirm}
                            disabled={createReservation.isPending}
                            className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #5E6AD2, #7C3AED)', color: '#fff' }}
                        >
                            {createReservation.isPending ? (
                                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <>
                                    <HiOutlineCheckCircle className="w-5 h-5" />
                                    예약 신청하기
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
