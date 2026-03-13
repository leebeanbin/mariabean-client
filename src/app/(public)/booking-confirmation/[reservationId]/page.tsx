'use client';

import { use } from 'react';
import Link from 'next/link';
import { useReservation } from '@/hooks/useReservations';
import { useFacility } from '@/hooks/useFacilities';
import { useResource } from '@/hooks/useResources';
import { HiOutlineCheckCircle, HiOutlineCalendarDays, HiOutlineArrowRight, HiOutlineClock } from 'react-icons/hi2';

interface PageProps {
    params: Promise<{ reservationId: string }>;
}

export default function BookingConfirmationPage({ params }: PageProps) {
    const { reservationId } = use(params);
    const { data: reservation, isLoading } = useReservation(Number(reservationId));
    const { data: facility } = useFacility(reservation?.facilityId ?? '');
    const { data: resource } = useResource(reservation?.resourceItemId ?? '');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: '#5E6AD2', borderTopColor: 'transparent' }} />
                    <p className="text-sm" style={{ color: '#71717A' }}>예약 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
                <p className="text-sm mb-4" style={{ color: '#71717A' }}>예약 정보를 찾을 수 없습니다.</p>
                <Link href="/book" className="btn-primary">예약 홈</Link>
            </div>
        );
    }

    const startDate = new Date(reservation.startTime);
    const endDate = new Date(reservation.endTime);
    const dateStr = startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    const startTimeStr = startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 w-full" style={{ background: '#FCFCFD' }}>
            <div className="w-full max-w-sm">
                {/* Success icon */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' }}
                    >
                        <HiOutlineCheckCircle className="w-10 h-10" style={{ color: '#22C55E' }} />
                    </div>
                    <h1 className="text-xl font-bold mb-1.5" style={{ color: '#18181B' }}>예약 신청 완료!</h1>
                    <p className="text-sm text-center" style={{ color: '#71717A' }}>
                        관리자 확인 후 최종 확정됩니다. 알림을 통해 안내드려요.
                    </p>
                </div>

                {/* Reservation details card */}
                <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid #E4E4E7' }}>
                    <div className="px-5 py-3.5" style={{ background: 'linear-gradient(135deg, #5E6AD2, #7C3AED)' }}>
                        <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>예약 번호</p>
                        <p className="text-lg font-bold text-white">#{String(reservation.id).padStart(6, '0')}</p>
                    </div>
                    {[
                        { icon: HiOutlineCalendarDays, label: '날짜', value: dateStr },
                        { icon: HiOutlineClock, label: '시간', value: `${startTimeStr} ~ ${endTimeStr}` },
                        { label: '시설', value: facility?.name ?? reservation.facilityId },
                        { label: '공간', value: resource?.name ?? reservation.resourceItemId },
                        { label: '상태', value: '승인 대기 중' },
                    ].map(({ icon: Icon, label, value }, i) => (
                        <div
                            key={label}
                            className="flex items-center px-5 py-3.5"
                            style={{ borderBottom: i < 4 ? '1px solid #F4F4F5' : 'none', background: '#fff' }}
                        >
                            <span className="text-[13px] w-14 flex-shrink-0" style={{ color: '#A1A1AA' }}>{label}</span>
                            <div className="flex items-center gap-2">
                                {Icon && <Icon className="w-3.5 h-3.5" style={{ color: '#5E6AD2' }} />}
                                <span className="text-[14px] font-medium" style={{ color: '#18181B' }}>{value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        href="/my-reservations"
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all"
                        style={{ background: '#5E6AD2', color: '#fff' }}
                    >
                        내 예약 확인하기
                        <HiOutlineArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/book"
                        className="flex items-center justify-center w-full py-3.5 rounded-2xl text-[14px] font-medium"
                        style={{ background: '#F4F4F5', color: '#52525B' }}
                    >
                        다른 시설 둘러보기
                    </Link>
                </div>
            </div>
        </div>
    );
}
