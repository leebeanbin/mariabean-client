'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAllReservations, useCancelReservation } from '@/hooks/useReservations';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import type { ReservationResponse } from '@/lib/types';
import {
    HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlineClock,
    HiOutlineXCircle, HiOutlineChevronRight,
} from 'react-icons/hi2';

export default function MyReservationsPage() {
    const [page, setPage] = useState(0);
    const { data, isLoading } = useAllReservations(page, 10);
    const cancelReservation = useCancelReservation();
    const toast = useToast();

    const reservations = data?.content ?? [];

    const handleCancel = (id: number) => {
        if (!confirm('예약을 취소하시겠습니까?')) return;
        cancelReservation.mutate(id, {
            onSuccess: () => toast.success('예약이 취소되었습니다.'),
            onError: () => toast.error('취소에 실패했습니다.'),
        });
    };

    return (
        <div className="min-h-screen" style={{ background: '#FCFCFD' }}>
            {/* Nav */}
            <div className="sticky top-0 z-10 px-4 py-3.5" style={{ background: 'rgba(252,252,253,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E4E4E7' }}>
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <Link href="/book" className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all">
                        <HiOutlineArrowLeft className="w-5 h-5" style={{ color: '#52525B' }} />
                    </Link>
                    <span className="font-semibold text-[16px]" style={{ color: '#18181B' }}>내 예약 내역</span>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="text-center py-16">
                        <HiOutlineCalendarDays className="w-12 h-12 mx-auto mb-3" style={{ color: '#E4E4E7' }} />
                        <p className="font-semibold mb-1.5" style={{ color: '#52525B' }}>예약 내역이 없습니다</p>
                        <p className="text-sm mb-6" style={{ color: '#A1A1AA' }}>원하는 공간을 예약해보세요</p>
                        <Link
                            href="/book"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ background: '#5E6AD2', color: '#fff' }}
                        >
                            시설 둘러보기
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {reservations.map(r => (
                                <ReservationCard
                                    key={r.id}
                                    reservation={r}
                                    onCancel={() => handleCancel(r.id)}
                                    isCancelling={cancelReservation.isPending}
                                />
                            ))}
                        </div>

                        {data && data.totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={data.first}
                                    className="px-4 py-2 rounded-xl text-sm disabled:opacity-40"
                                    style={{ border: '1px solid #E4E4E7', background: '#fff' }}
                                >이전</button>
                                <span className="px-4 py-2 text-sm" style={{ color: '#71717A' }}>
                                    {data.number + 1} / {data.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={data.last}
                                    className="px-4 py-2 rounded-xl text-sm disabled:opacity-40"
                                    style={{ border: '1px solid #E4E4E7', background: '#fff' }}
                                >다음</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#EAB308',
    CONFIRMED: '#5E6AD2',
    CANCELLED: '#A1A1AA',
    COMPLETED: '#22C55E',
    REJECTED: '#EF4444',
};

function ReservationCard({
    reservation, onCancel, isCancelling
}: {
    reservation: ReservationResponse;
    onCancel: () => void;
    isCancelling: boolean;
}) {
    const startDate = new Date(reservation.startTime);
    const endDate = new Date(reservation.endTime);
    const dateStr = startDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    const timeStr = `${startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    const accentColor = STATUS_COLORS[reservation.status] ?? '#A1A1AA';

    return (
        <div className="rounded-2xl overflow-hidden flex" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
            {/* Status accent bar */}
            <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: accentColor }} />
            <div className="flex-1 px-4 py-3.5">
                <div className="flex items-start justify-between mb-2.5">
                    <div className="min-w-0">
                        <p className="text-[11px] font-mono font-medium mb-0.5" style={{ color: '#A1A1AA' }}>
                            #{String(reservation.id).padStart(6, '0')}
                        </p>
                        <p className="font-semibold text-[15px] truncate" style={{ color: '#18181B' }}>
                            시설 예약
                        </p>
                    </div>
                    <StatusBadge status={reservation.status} />
                </div>

                <div className="rounded-xl px-3 py-2.5 mb-3 space-y-1.5" style={{ background: '#F9F9FB' }}>
                    <div className="flex items-center gap-2">
                        <HiOutlineCalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#71717A' }} />
                        <span className="text-[12px] font-medium" style={{ color: '#52525B' }}>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#71717A' }} />
                        <span className="text-[12px] font-medium" style={{ color: '#52525B' }}>{timeStr}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Link
                        href={`/reservations/${reservation.id}`}
                        className="flex items-center gap-1 text-[12px] font-semibold py-1.5"
                        style={{ color: '#5E6AD2' }}
                    >
                        상세 보기
                        <HiOutlineChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    {reservation.status === 'PENDING' && (
                        <button
                            onClick={onCancel}
                            disabled={isCancelling}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
                            style={{ background: '#FEF2F2', color: '#EF4444' }}
                        >
                            <HiOutlineXCircle className="w-3.5 h-3.5" />
                            취소
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
