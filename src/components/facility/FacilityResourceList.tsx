'use client';

import { HiOutlineClock, HiOutlineUsers } from 'react-icons/hi2';
import type { ResourceItemResponse } from '@/lib/types';

interface FacilityResourceListProps {
    resources: ResourceItemResponse[];
    resourceViewFilter: 'ALL' | 'SEAT' | 'OTHER';
    onChangeResourceViewFilter: (value: 'ALL' | 'SEAT' | 'OTHER') => void;
    selectedResourceId: string | null;
    onSelectResource: (resourceId: string) => void;
    onReserveResource: (resourceId: string) => void;
    typeLabels: Record<string, string>;
    getSeatLayoutSummary: (resource: ResourceItemResponse) => string | null;
}

export default function FacilityResourceList({
    resources,
    resourceViewFilter,
    onChangeResourceViewFilter,
    selectedResourceId,
    onSelectResource,
    onReserveResource,
    typeLabels,
    getSeatLayoutSummary,
}: FacilityResourceListProps) {
    const displayResources = resourceViewFilter === 'SEAT'
        ? resources.filter((r) => r.resourceType === 'SEAT')
        : resourceViewFilter === 'OTHER'
            ? resources.filter((r) => r.resourceType !== 'SEAT')
            : resources;

    return (
        <>
            <div className="px-4 sm:px-5 py-3 flex items-center gap-1.5 flex-wrap" style={{ borderBottom: '1px solid #F0F2F5' }}>
                {[
                    { key: 'ALL', label: `전체 (${resources.length})` },
                    { key: 'SEAT', label: `좌석 (${resources.filter((r) => r.resourceType === 'SEAT').length})` },
                    { key: 'OTHER', label: `일반 공간 (${resources.filter((r) => r.resourceType !== 'SEAT').length})` },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onChangeResourceViewFilter(tab.key as 'ALL' | 'SEAT' | 'OTHER')}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={resourceViewFilter === tab.key
                            ? { background: 'rgba(94,106,210,0.08)', color: '#5E6AD2' }
                            : { background: '#F0F2F5', color: '#64748B' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {displayResources.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: '#9BA8BA' }}>등록된 공간이 없습니다.</p>
                </div>
            ) : (
                <div>
                    {displayResources.map((resource, idx) => {
                        const isSelected = selectedResourceId === resource.id;
                        const hasWait = resource.estimatedWaitMinutes && resource.estimatedWaitMinutes > 0;
                        const seatSummary = getSeatLayoutSummary(resource);
                        return (
                            <div
                                key={resource.id}
                                className="px-4 sm:px-5 py-4 flex items-start sm:items-center gap-3 sm:gap-4 transition-colors cursor-pointer"
                                style={{
                                    borderBottom: idx < displayResources.length - 1 ? '1px solid #F0F2F5' : 'none',
                                    background: isSelected ? 'rgba(94,106,210,0.08)' : undefined,
                                }}
                                onClick={() => onSelectResource(resource.id)}
                                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}
                            >
                                <div
                                    className="w-1.5 h-8 rounded-full flex-shrink-0 transition-all mt-1 sm:mt-0"
                                    style={{ background: isSelected ? '#5E6AD2' : '#F0F2F5' }}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold" style={{ color: '#0F172A' }}>
                                            {resource.name}
                                        </span>
                                        <span
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: '#F0F2F5', color: '#4A5568' }}
                                        >
                                            {typeLabels[resource.resourceType] || resource.resourceType}
                                        </span>
                                        {hasWait && (
                                            <span
                                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                                                style={{ background: '#FFF4E5', color: '#C47A00' }}
                                            >
                                                <HiOutlineClock className="w-3 h-3" />
                                                대기 {resource.estimatedWaitMinutes}분
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-xs flex items-center gap-1" style={{ color: '#718096' }}>
                                            <HiOutlineUsers className="w-3.5 h-3.5" />
                                            최대 {resource.limitCapacity}명
                                        </span>
                                        {resource.location && (
                                            <span className="text-xs" style={{ color: '#718096' }}>{resource.location}</span>
                                        )}
                                        {resource.floor !== null && resource.floor !== undefined && (
                                            <span className="text-xs" style={{ color: '#718096' }}>{resource.floor}층</span>
                                        )}
                                        {seatSummary && (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E8FAF3', color: '#065F46' }}>
                                                {seatSummary}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onReserveResource(resource.id);
                                    }}
                                    className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0 transition-all"
                                    style={{ background: '#5E6AD2', boxShadow: '0 2px 6px rgba(67,97,238,0.3)' }}
                                >
                                    예약
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
