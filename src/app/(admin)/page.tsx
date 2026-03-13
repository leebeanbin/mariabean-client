'use client';

import {
    HiOutlineSquares2X2,
    HiOutlineChevronRight,
} from 'react-icons/hi2';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { useAllReservations } from '@/hooks/useReservations';
import { useFacilityTotalCount } from '@/hooks/useFacilities';
import type { ReservationResponse } from '@/lib/types';

export default function DashboardPage() {
    const { data: reservationsPage, isLoading: resLoading } = useAllReservations(0, 10);
    const { data: totalFacilities, isLoading: facLoading } = useFacilityTotalCount();

    const reservations = reservationsPage?.content ?? [];
    const isLoading = resLoading || facLoading;

    const pendingCount = reservations.filter((r: ReservationResponse) => r.status === 'PENDING').length;
    const confirmedCount = reservations.filter((r: ReservationResponse) => r.status === 'CONFIRMED').length;
    const normalizedTotalFacilities = totalFacilities ?? 0;

    const fmtTime = (iso: string) => iso ? iso.substring(11, 16) : '';
    const fmtDate = (iso: string) => iso ? iso.substring(5, 10).replace('-', '/') : '';

    return (
        <div className="space-y-6">
            {/* Context bar: without relying on title copy */}
            <h1 className="sr-only">대시보드</h1>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <HiOutlineSquares2X2 className="w-4 h-4" style={{ color: '#52525B' }} />
                    </div>
                    <div className="flex items-center gap-3 text-[13px] min-w-0" style={{ color: '#71717A' }}>
                        <span>시설 <span className="font-semibold tabular-nums" style={{ color: '#18181B' }}>{isLoading ? '–' : normalizedTotalFacilities}</span></span>
                        <span style={{ color: '#D4D4D8' }}>|</span>
                        <span>대기 <span className="font-semibold tabular-nums" style={{ color: pendingCount > 0 ? '#EAB308' : '#18181B' }}>{isLoading ? '–' : pendingCount}</span></span>
                        <span style={{ color: '#D4D4D8' }}>|</span>
                        <span>확정 <span className="font-semibold tabular-nums" style={{ color: '#18181B' }}>{isLoading ? '–' : confirmedCount}</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <Link href="/facilities" className="btn-secondary">시설</Link>
                    <Link href="/reservations" className="btn-secondary">예약</Link>
                </div>
            </div>

            {/* Main content — recent reservations list */}
            <div className="pt-1">
                <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>최근 예약</h2>
                    <Link
                        href="/reservations"
                        className="text-[12px] font-medium flex items-center gap-0.5 transition-colors hover:opacity-70"
                        style={{ color: '#5E6AD2' }}
                    >
                        전체보기
                        <HiOutlineChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="py-6 space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="skeleton h-3 w-14" />
                                <div className="skeleton h-3 flex-1" />
                                <div className="skeleton h-3 w-24" />
                            </div>
                        ))}
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F4F4F5' }}>
                            <HiOutlineSquares2X2 className="w-5 h-5" style={{ color: '#A1A1AA' }} />
                        </div>
                        <p className="text-[14px] font-medium mb-1" style={{ color: '#52525B' }}>아직 예약이 없습니다</p>
                        <p className="text-[12px] mb-4" style={{ color: '#A1A1AA' }}>시설을 등록하면 예약을 받을 수 있습니다</p>
                        <Link href="/facilities/register" className="btn-primary text-[12px]">시설 등록하기</Link>
                    </div>
                ) : (
                    <div>
                        {reservations.map((res: ReservationResponse) => (
                            <Link
                                key={res.id}
                                href={`/reservations/${res.id}`}
                                className="flex items-center gap-3 py-2.5 rounded-md transition-colors hover:bg-black/[0.03] -mx-2 px-2 group"
                            >
                                <span className="text-[12px] font-mono font-medium w-12 flex-shrink-0" style={{ color: '#5E6AD2' }}>
                                    #{String(res.id).padStart(4, '0')}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-medium truncate block" style={{ color: '#18181B' }}>
                                        {res.facilityId}
                                    </span>
                                    <span className="text-[11px] tabular-nums" style={{ color: '#A1A1AA' }}>
                                        {fmtDate(res.startTime)} {fmtTime(res.startTime)}
                                    </span>
                                </div>
                                <span className="flex-shrink-0">
                                    <StatusBadge status={res.status} />
                                </span>
                                <HiOutlineChevronRight
                                    className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
                                    style={{ color: '#D4D4D8' }}
                                />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
