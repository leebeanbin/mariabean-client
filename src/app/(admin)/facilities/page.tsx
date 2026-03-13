'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HiOutlineMagnifyingGlass, HiOutlineMapPin, HiOutlineBuildingOffice2, HiOutlineChevronRight } from 'react-icons/hi2';
import { useFacilities } from '@/hooks/useFacilities';
import type { FacilityResponse } from '@/lib/types';

const categories = ['전체', 'HOSPITAL', 'OFFICE', 'COMMUNITY', 'SPORTS', 'LIBRARY', 'OTHER'];
const categoryLabels: Record<string, string> = {
    전체: '전체', HOSPITAL: '의료시설', OFFICE: '사무공간', COMMUNITY: '주민센터',
    SPORTS: '체육시설', LIBRARY: '도서관', OTHER: '기타',
};

export default function FacilitiesPage() {
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const { data, isLoading } = useFacilities(
        selectedCategory === '전체' ? undefined : selectedCategory,
        page,
        20
    );

    const facilities = data?.content ?? [];
    const totalPages = data?.totalPages ?? 0;

    const filtered = search
        ? facilities.filter((f: FacilityResponse) =>
            f.name.includes(search) || (f.address && f.address.includes(search))
        )
        : facilities;

    return (
        <div className="space-y-4">
            {/* Context bar */}
            <h1 className="sr-only">시설 관리</h1>
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <HiOutlineBuildingOffice2 className="w-4 h-4" style={{ color: '#52525B' }} />
                    </div>
                    <div className="text-[13px]" style={{ color: '#71717A' }}>
                        시설 <span className="font-semibold tabular-nums" style={{ color: '#18181B' }}>{data?.totalElements ?? facilities.length}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <Link href="/map" className="btn-secondary">지도</Link>
                    <Link href="/facilities/register" className="btn-primary">등록</Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A1A1AA' }} />
                    <input
                        type="text"
                        placeholder="시설명 또는 주소 검색..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-[7px] rounded-md text-[13px]"
                        style={{ background: 'transparent', border: '1px solid #DDDDE0', color: '#18181B', outline: 'none' }}
                    />
                </div>
                <div className="flex flex-wrap gap-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setPage(0); }}
                            className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
                            style={selectedCategory === cat
                                ? { background: '#18181B', color: '#FAFAFA' }
                                : { color: '#71717A' }
                            }
                            onMouseEnter={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                            onMouseLeave={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = ''; }}
                        >
                            {categoryLabels[cat]}
                        </button>
                    ))}
                </div>
            </div>

            {/* List — divider-separated, no card container */}
            <div>
                {isLoading ? (
                    <div className="py-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="skeleton h-3.5 w-32" />
                                <div className="skeleton h-3 flex-1" />
                                <div className="skeleton h-3 w-16" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-14 text-center">
                        <HiOutlineBuildingOffice2 className="w-5 h-5 mx-auto mb-2" style={{ color: '#D4D4D8' }} />
                        <p className="text-[13px]" style={{ color: '#A1A1AA' }}>등록된 시설이 없습니다</p>
                        <Link href="/facilities/register" className="text-[12px] font-medium mt-1 inline-block" style={{ color: '#5E6AD2' }}>
                            시설 등록하기 →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-1 pt-1">
                        {filtered.map((facility: FacilityResponse) => (
                            <Link
                                key={facility.id}
                                href={`/facilities/${facility.id}`}
                                className="flex items-center gap-4 py-2.5 transition-colors rounded-md hover:bg-black/[0.03] group -mx-1 px-2"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium" style={{ color: '#18181B' }}>
                                            {facility.name}
                                        </span>
                                        <span
                                            className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(0,0,0,0.04)', color: '#71717A' }}
                                        >
                                            {categoryLabels[facility.category] || facility.category}
                                        </span>
                                    </div>
                                    {facility.address && (
                                        <span className="flex items-center gap-1 mt-0.5 text-[12px]" style={{ color: '#A1A1AA' }}>
                                            <HiOutlineMapPin className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{facility.address}</span>
                                        </span>
                                    )}
                                </div>
                                <HiOutlineChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D4D4D8' }} />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] transition-colors disabled:opacity-30"
                        style={{ color: '#71717A' }}
                    >
                        ‹
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-medium transition-colors"
                            style={page === i
                                ? { background: '#18181B', color: '#FAFAFA' }
                                : { color: '#71717A' }
                            }
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-[13px] transition-colors disabled:opacity-30"
                        style={{ color: '#71717A' }}
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
}
