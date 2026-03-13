'use client';

import { useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { HiOutlineCalendarDays, HiOutlineChevronRight, HiOutlineBell } from 'react-icons/hi2';
import { useAllReservations, useCancelReservation, useCallNext } from '@/hooks/useReservations';
import { useFacilities } from '@/hooks/useFacilities';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import type { ReservationStatus, ReservationResponse } from '@/lib/types';

const statusFilters: { label: string; value: ReservationStatus | 'ALL' }[] = [
    { label: '전체', value: 'ALL' },
    { label: '대기중', value: 'PENDING' },
    { label: '확정', value: 'CONFIRMED' },
    { label: '취소', value: 'CANCELLED' },
    { label: '만료', value: 'EXPIRED' },
];

export default function ReservationsPage() {
    const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(0);

    const { data, isLoading } = useAllReservations(page, 20);
    const { data: facilitiesPage } = useFacilities(undefined, 0, 100);
    const cancelReservation = useCancelReservation();
    const callNext = useCallNext();
    const toast = useToast();
    const { isAdmin } = useAuthStore();

    const allReservations = data?.content ?? [];
    const facilityNameMap = new Map((facilitiesPage?.content ?? []).map((f) => [f.id, f.name]));
    const totalPages = data?.totalPages ?? 0;
    const pendingCount = allReservations.filter((r: ReservationResponse) => r.status === 'PENDING').length;

    // Unique resourceItemIds with PENDING reservations (for admin "call next")
    const pendingResourceIds = [...new Set(
        allReservations
            .filter((r: ReservationResponse) => r.status === 'PENDING')
            .map((r: ReservationResponse) => r.resourceItemId)
    )];

    const filtered = statusFilter === 'ALL'
        ? allReservations
        : allReservations.filter((r: ReservationResponse) => r.status === statusFilter);

    const fmtTime = (iso: string) => iso ? iso.substring(11, 16) : '';
    const fmtDate = (iso: string) => iso ? iso.substring(5, 10).replace('-', '/') : '';

    const handleCancel = (id: number) => {
        if (!confirm('예약을 취소하시겠습니까?')) return;
        cancelReservation.mutate(id, {
            onSuccess: () => toast.success('예약이 취소되었습니다.'),
            onError: () => toast.error('취소 처리 중 오류가 발생했습니다.'),
        });
    };

    const handleCallNext = (resourceItemId: string) => {
        callNext.mutate(resourceItemId, {
            onSuccess: (res) => toast.success(`#${String(res?.id).padStart(4, '0')} 예약을 다음 순서로 호출했습니다.`),
            onError: () => toast.error('대기 중인 예약이 없거나 호출 처리 중 오류가 발생했습니다.'),
        });
    };

    return (
        <div className="space-y-4">
            {/* Context bar */}
            <h1 className="sr-only">예약 관리</h1>
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <HiOutlineCalendarDays className="w-4 h-4" style={{ color: '#52525B' }} />
                    </div>
                    <div className="text-[13px]" style={{ color: '#71717A' }}>
                        대기 <span className="font-semibold tabular-nums" style={{ color: pendingCount > 0 ? '#EAB308' : '#18181B' }}>{pendingCount}</span>
                        <span className="mx-2" style={{ color: '#D4D4D8' }}>|</span>
                        전체 <span className="font-semibold tabular-nums" style={{ color: '#18181B' }}>{data?.totalElements ?? allReservations.length}</span>
                    </div>
                </div>
                <Link href="/facilities" className="btn-secondary">시설</Link>
            </div>

            {/* Admin: Call Next panel */}
            {isAdmin && pendingResourceIds.length > 0 && (
                <div
                    className="rounded-2xl p-4"
                    style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <HiOutlineBell className="w-4 h-4" style={{ color: '#F97316' }} />
                        <p className="text-[13px] font-semibold" style={{ color: '#9A3412' }}>
                            대기열 호출
                        </p>
                        <span
                            className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#FED7AA', color: '#9A3412' }}
                        >
                            {pendingCount}명 대기
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pendingResourceIds.map((rid) => (
                            <button
                                key={rid}
                                onClick={() => handleCallNext(rid)}
                                disabled={callNext.isPending}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
                                style={{ background: '#F97316', color: '#fff' }}
                            >
                                <HiOutlineBell className="w-3.5 h-3.5" />
                                {rid} 다음 호출
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters — no background, text only */}
            <div className="flex flex-wrap gap-1">
                {statusFilters.map(({ label, value }) => (
                    <button
                        key={value}
                        onClick={() => { setStatusFilter(value); setPage(0); }}
                        className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
                        style={statusFilter === value
                            ? { background: '#18181B', color: '#FAFAFA' }
                            : { color: '#71717A' }
                        }
                        onMouseEnter={e => { if (statusFilter !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                        onMouseLeave={e => { if (statusFilter !== value) (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Table — borderless, divider-separated */}
            <div>
                {isLoading ? (
                    <div className="py-4 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="skeleton h-3 w-12" />
                                <div className="skeleton h-3 flex-1" />
                                <div className="skeleton h-3 w-20" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-14 text-center">
                        <HiOutlineCalendarDays className="w-5 h-5 mx-auto mb-2" style={{ color: '#D4D4D8' }} />
                        <p className="text-[13px]" style={{ color: '#A1A1AA' }}>
                            {statusFilter === 'ALL' ? '예약 내역이 없습니다' : `${statusFilters.find(f => f.value === statusFilter)?.label} 예약이 없습니다`}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <div className="hidden md:block">
                            <div className="flex items-center px-1 py-2 text-[11px] font-medium" style={{ color: '#A1A1AA', borderBottom: '1px solid #F0F1F3' }}>
                                <span className="w-16">번호</span>
                                <span className="flex-1">시설</span>
                                <span className="w-24">공간</span>
                                <span className="w-28">이용 시간</span>
                                <span className="w-20">신청일</span>
                                <span className="w-16">상태</span>
                                <span className="w-12"></span>
                            </div>
                            {filtered.map((res: ReservationResponse) => (
                                <div
                                    key={res.id}
                                    className="flex items-center px-2 py-2.5 text-[13px] transition-colors rounded-md hover:bg-black/[0.03] -mx-1"
                                >
                                    <Link href={`/reservations/${res.id}`} className="w-16 font-mono font-medium" style={{ color: '#5E6AD2' }}>
                                        #{String(res.id).padStart(4, '0')}
                                    </Link>
                                    <span className="flex-1 font-medium truncate" style={{ color: '#18181B' }}>
                                        {facilityNameMap.get(res.facilityId) ?? res.facilityId}
                                    </span>
                                    <span className="w-24 truncate" style={{ color: '#71717A' }}>
                                        {res.resourceItemId}
                                    </span>
                                    <span className="w-28 tabular-nums" style={{ color: '#71717A' }}>
                                        {fmtDate(res.startTime)} {fmtTime(res.startTime)}–{fmtTime(res.endTime)}
                                    </span>
                                    <span className="w-20 tabular-nums" style={{ color: '#A1A1AA' }}>
                                        {res.createdAt?.substring(5, 10).replace('-', '/') ?? '–'}
                                    </span>
                                    <span className="w-16">
                                        <StatusBadge status={res.status} />
                                    </span>
                                    <span className="w-12 text-right">
                                        {res.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleCancel(res.id)}
                                                className="text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors hover:bg-red-50"
                                                style={{ color: '#EF4444' }}
                                            >
                                                취소
                                            </button>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-1 pt-1">
                            {filtered.map((res: ReservationResponse) => (
                                <Link
                                    key={res.id}
                                    href={`/reservations/${res.id}`}
                                    className="flex items-center gap-3 py-3 transition-colors rounded-md hover:bg-black/[0.03] -mx-1 px-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[12px] font-mono font-medium" style={{ color: '#5E6AD2' }}>
                                                #{String(res.id).padStart(4, '0')}
                                            </span>
                                            <span className="text-[13px] font-medium truncate" style={{ color: '#18181B' }}>
                                                {facilityNameMap.get(res.facilityId) ?? res.facilityId}
                                            </span>
                                        </div>
                                        <span className="text-[12px] tabular-nums" style={{ color: '#A1A1AA' }}>
                                            {fmtDate(res.startTime)} {fmtTime(res.startTime)}–{fmtTime(res.endTime)}
                                        </span>
                                    </div>
                                    <StatusBadge status={res.status} />
                                    <HiOutlineChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D4D4D8' }} />
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] disabled:opacity-30" style={{ color: '#71717A' }}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                        <button key={i} onClick={() => setPage(i)}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-medium"
                            style={page === i ? { background: '#18181B', color: '#FAFAFA' } : { color: '#71717A' }}>
                            {i + 1}
                        </button>
                    ))}
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] disabled:opacity-30" style={{ color: '#71717A' }}>›</button>
                </div>
            )}
        </div>
    );
}
