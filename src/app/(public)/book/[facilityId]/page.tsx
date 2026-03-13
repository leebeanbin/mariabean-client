'use client';

import { use } from 'react';
import Link from 'next/link';
import { useFacility } from '@/hooks/useFacilities';
import { useResourcesByFacility } from '@/hooks/useResources';
import type { ResourceItemResponse } from '@/lib/types';
import {
    HiOutlineArrowLeft, HiOutlineMapPin, HiOutlineBuildingOffice2,
    HiOutlineUsers, HiOutlineArrowRight, HiOutlineTag,
} from 'react-icons/hi2';

const RESOURCE_TYPE_LABELS: Record<string, string> = {
    ROOM: '회의실',
    HALL: '강당',
    SEMINAR: '세미나실',
    GYM: '체육관',
    LAB: '실험실',
    SEAT: '좌석',
};

interface PageProps {
    params: Promise<{ facilityId: string }>;
}

export default function FacilityBookPage({ params }: PageProps) {
    const { facilityId } = use(params);
    const { data: facility, isLoading: fLoading } = useFacility(facilityId);
    const { data: resourcesPage, isLoading: rLoading } = useResourcesByFacility(facilityId);

    const resources = resourcesPage?.content ?? [];

    if (fLoading) {
        return (
            <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
                <div className="skeleton h-8 w-24 rounded-lg mb-6" />
                <div className="skeleton h-32 rounded-2xl mb-6" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
                <p className="text-sm mb-4" style={{ color: '#71717A' }}>시설을 찾을 수 없습니다.</p>
                <Link href="/book" className="btn-primary">목록으로</Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col w-full" style={{ background: '#FCFCFD' }}>
            {/* Back nav */}
            <div className="sticky top-0 z-10 px-4 py-3.5" style={{ background: 'rgba(252,252,253,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E4E4E7' }}>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/book" className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100">
                        <HiOutlineArrowLeft className="w-5 h-5" style={{ color: '#52525B' }} />
                    </Link>
                    <span className="font-semibold text-[15px]" style={{ color: '#18181B' }}>{facility.name}</span>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Facility info card */}
                <div className="rounded-2xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: '#F0F0FF' }}
                        >
                            <HiOutlineBuildingOffice2 className="w-6 h-6" style={{ color: '#5E6AD2' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold mb-1" style={{ color: '#18181B' }}>{facility.name}</h1>
                            {facility.address && (
                                <div className="flex items-start gap-1.5 mb-2">
                                    <HiOutlineMapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#A1A1AA' }} />
                                    <p className="text-[12px]" style={{ color: '#71717A' }}>{facility.address}</p>
                                </div>
                            )}
                            {facility.description && (
                                <p className="text-[13px]" style={{ color: '#52525B' }}>{facility.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resources */}
                <h2 className="text-[15px] font-bold mb-3" style={{ color: '#18181B' }}>
                    예약 가능한 공간 {resources.length > 0 ? `(${resources.length})` : ''}
                </h2>

                {rLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                        <HiOutlineBuildingOffice2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#D4D4D8' }} />
                        <p className="text-sm" style={{ color: '#71717A' }}>현재 예약 가능한 공간이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {resources.map(r => <ResourceCard key={r.id} resource={r} facilityId={facilityId} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

function ResourceCard({ resource, facilityId }: { resource: ResourceItemResponse; facilityId: string }) {
    const typeLabel = RESOURCE_TYPE_LABELS[resource.resourceType] ?? resource.resourceType;
    return (
        <Link
            href={`/book/${facilityId}/${resource.id}`}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:shadow-sm active:scale-[0.99]"
            style={{ background: '#fff', border: '1px solid #E4E4E7' }}
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F0F0FF' }}>
                <HiOutlineTag className="w-5 h-5" style={{ color: '#5E6AD2' }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] mb-0.5" style={{ color: '#18181B' }}>{resource.name}</p>
                <div className="flex items-center gap-3">
                    <span className="text-[12px]" style={{ color: '#71717A' }}>{typeLabel}</span>
                    {resource.floor && (
                        <span className="text-[12px]" style={{ color: '#71717A' }}>{resource.floor}층</span>
                    )}
                    <div className="flex items-center gap-1">
                        <HiOutlineUsers className="w-3.5 h-3.5" style={{ color: '#A1A1AA' }} />
                        <span className="text-[12px]" style={{ color: '#71717A' }}>최대 {resource.limitCapacity}명</span>
                    </div>
                </div>
                {resource.estimatedWaitMinutes != null && resource.estimatedWaitMinutes > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: '#EAB308' }}>
                        예상 대기 {resource.estimatedWaitMinutes}분
                    </p>
                )}
            </div>
            <div className="px-3 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 flex-shrink-0" style={{ background: '#5E6AD2', color: '#fff' }}>
                예약
                <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </div>
        </Link>
    );
}
