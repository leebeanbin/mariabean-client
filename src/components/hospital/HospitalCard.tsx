'use client';

import Link from 'next/link';
import { HiOutlineMapPin, HiOutlineChevronRight } from 'react-icons/hi2';
import OpenNowBadge from './OpenNowBadge';
import { getSpecialtyName, getSpecialtyIcon } from '@/lib/hiraSpecialties';
import type { HospitalSearchResult } from '@/lib/types';

interface HospitalCardProps {
    hospital: HospitalSearchResult;
    distanceKm?: number;
}

export default function HospitalCard({ hospital, distanceKm }: HospitalCardProps) {
    const isInternal = hospital.source === 'INTERNAL';
    const maxSpecialties = 3;
    const visibleSpecialties = hospital.specialties.slice(0, maxSpecialties);
    const extraCount = hospital.specialties.length - maxSpecialties;

    return (
        <div
            className="relative rounded-2xl overflow-hidden"
            style={{
                background: '#fff',
                border: '1px solid #E4E4E7',
            }}
        >
            {/* 상단 컬러 바 */}
            <div
                className="h-1.5"
                style={{
                    background: isInternal
                        ? 'linear-gradient(90deg, #5E6AD2, #4E5BBF)'
                        : 'linear-gradient(90deg, #A1A1AA, #D4D4D8)',
                }}
            />

            <div className="p-4">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <OpenNowBadge openNow={hospital.openNow} />
                        {!isInternal && (
                            <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background: '#F4F4F5', color: '#71717A' }}
                            >
                                외부 정보
                            </span>
                        )}
                        {distanceKm !== undefined && (
                            <span className="text-[11px]" style={{ color: '#A1A1AA' }}>
                                {distanceKm < 1
                                    ? `${Math.round(distanceKm * 1000)}m`
                                    : `${distanceKm.toFixed(1)}km`}
                            </span>
                        )}
                    </div>
                    <HiOutlineChevronRight
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: '#D4D4D8' }}
                    />
                </div>

                {/* 병원명 */}
                <h3
                    className="font-semibold text-[15px] mb-1.5 leading-tight"
                    style={{ color: '#18181B' }}
                >
                    {hospital.name}
                </h3>

                {/* 주소 */}
                {hospital.address && (
                    <div className="flex items-start gap-1.5 mb-3">
                        <HiOutlineMapPin
                            className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                            style={{ color: '#A1A1AA' }}
                        />
                        <p
                            className="text-[12px] leading-relaxed line-clamp-1"
                            style={{ color: '#71717A' }}
                        >
                            {hospital.address}
                        </p>
                    </div>
                )}

                {/* 진료과 칩 */}
                {hospital.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {visibleSpecialties.map(code => (
                            <span
                                key={code}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                                style={{ background: '#EEF2FF', color: '#4E5BBF' }}
                            >
                                <span>{getSpecialtyIcon(code)}</span>
                                {getSpecialtyName(code)}
                            </span>
                        ))}
                        {extraCount > 0 && (
                            <span
                                className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
                                style={{ background: '#F4F4F5', color: '#71717A' }}
                            >
                                +{extraCount}
                            </span>
                        )}
                    </div>
                )}

                {/* CTA */}
                {isInternal && hospital.facilityId ? (
                    <Link
                        href={`/book/${hospital.facilityId}`}
                        className="block w-full py-2.5 rounded-xl text-center text-[13px] font-semibold"
                        style={{ background: '#EEF2FF', color: '#4E5BBF' }}
                    >
                        시설 예약하기
                    </Link>
                ) : (
                    <div
                        className="w-full py-2.5 rounded-xl text-center text-[13px] font-semibold"
                        style={{ background: '#F4F4F5', color: '#A1A1AA' }}
                    >
                        예약 미지원 (외부 정보)
                    </div>
                )}
            </div>
        </div>
    );
}
