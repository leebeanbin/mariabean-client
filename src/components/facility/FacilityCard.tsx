import Link from 'next/link';
import {
    HiOutlineBuildingOffice2,
    HiOutlineChevronRight,
    HiOutlineMapPin,
    HiOutlineHeart,
    HiOutlineUsers,
    HiOutlineBeaker,
    HiOutlineAcademicCap,
} from 'react-icons/hi2';
import type { FacilityResponse } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: typeof HiOutlineBuildingOffice2 }> = {
    HOSPITAL:  { label: '의료시설',    color: '#EF4444', bg: '#FEF2F2', icon: HiOutlineHeart },
    OFFICE:    { label: '사무·오피스', color: '#5E6AD2', bg: '#F0F0FF', icon: HiOutlineBuildingOffice2 },
    COMMUNITY: { label: '커뮤니티',    color: '#22C55E', bg: '#F0FDF4', icon: HiOutlineUsers },
    SPORTS:    { label: '스포츠',      color: '#EAB308', bg: '#FEFCE8', icon: HiOutlineBeaker },
    LIBRARY:   { label: '도서관',      color: '#A855F7', bg: '#FAF5FF', icon: HiOutlineAcademicCap },
    OTHER:     { label: '기타',        color: '#71717A', bg: '#F4F4F5', icon: HiOutlineBuildingOffice2 },
};

// ─── FacilityCard ─────────────────────────────────────────────────────────────

export default function FacilityCard({ facility, highlight }: { facility: FacilityResponse; highlight?: boolean }) {
    const meta = CATEGORY_META[facility.category] ?? CATEGORY_META.OTHER;
    const Icon = meta.icon;
    return (
        <Link
            href={`/book/${facility.id}`}
            className="block rounded-2xl overflow-hidden group transition-all hover:shadow-md"
            style={{ background: '#fff', border: highlight ? `1.5px solid ${meta.color}40` : '1px solid #E4E4E7' }}
        >
            {/* Top accent bar */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}60)` }} />
            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                            <Icon className="w-4.5 h-4.5" style={{ color: meta.color }} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold truncate leading-tight" style={{ color: '#18181B' }}>
                                {facility.name}
                            </p>
                            <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        </div>
                    </div>
                    <HiOutlineChevronRight
                        className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#D4D4D8' }}
                    />
                </div>

                {/* Address */}
                {facility.address && (
                    <div className="flex items-start gap-1.5 mb-3">
                        <HiOutlineMapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#A1A1AA' }} />
                        <p className="text-[12px] leading-snug line-clamp-2" style={{ color: '#71717A' }}>
                            {facility.address}
                        </p>
                    </div>
                )}

                {/* Description */}
                {facility.description && (
                    <p className="text-[12px] leading-snug line-clamp-2 mb-3" style={{ color: '#71717A' }}>
                        {facility.description}
                    </p>
                )}

                {/* CTA */}
                <div
                    className="flex items-center justify-between pt-3 mt-auto"
                    style={{ borderTop: '1px solid #F4F4F5' }}
                >
                    <span className="text-[12px] font-semibold" style={{ color: '#5E6AD2' }}>공간 보기</span>
                    <HiOutlineChevronRight className="w-3.5 h-3.5" style={{ color: '#5E6AD2' }} />
                </div>
            </div>
        </Link>
    );
}
