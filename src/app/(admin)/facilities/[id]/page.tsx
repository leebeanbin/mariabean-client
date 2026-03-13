'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
    HiOutlineMapPin, HiOutlineArrowLeft,
    HiOutlineBuildingOffice2, HiOutlinePlus,
} from 'react-icons/hi2';
import { useFacility } from '@/hooks/useFacilities';
import { useResourcesByFacility, useCreateResource } from '@/hooks/useResources';
import { useCreateReservation } from '@/hooks/useReservations';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import type { CommonResponse, ResourceItemResponse } from '@/lib/types';
import { toIsoLocalDateTime, validateReservationWindow } from '@/lib/dateTime';
import SeatLayoutBuilder, { type SeatLayoutValue } from '@/components/facility/SeatLayoutBuilder';
import FacilitySeatQuickPicker, { type SeatResourceMeta } from '@/components/facility/FacilitySeatQuickPicker';
import FacilityResourceList from '@/components/facility/FacilityResourceList';
import FacilityReserveModal from '@/components/facility/FacilityReserveModal';

const typeLabels: Record<string, string> = {
    HALL: '강당', ROOM: '회의실', SEMINAR: '세미나실', GYM: '체육관', LAB: '연구실', SEAT: '좌석',
};

function getSeatLayoutSummary(resource: ResourceItemResponse): string | null {
    const attrs = resource.customAttributes;
    if (!attrs || typeof attrs !== 'object') return null;

    const layoutType = attrs.layoutType;
    const seats = attrs.seats;
    if (layoutType !== 'GRID' || !Array.isArray(seats)) return null;

    const enabledCount = seats.filter((seat) => {
        if (!seat || typeof seat !== 'object') return false;
        return (seat as { enabled?: boolean }).enabled !== false;
    }).length;

    return `좌석 ${enabledCount}개`;
}

function getSeatOptions(resource: ResourceItemResponse | undefined): string[] {
    if (!resource?.customAttributes || typeof resource.customAttributes !== 'object') return [];
    const attrs = resource.customAttributes as Record<string, unknown>;
    const layoutType = attrs.layoutType;

    if (layoutType === 'GRID' && Array.isArray(attrs.seats)) {
        return attrs.seats
            .filter((seat): seat is { enabled?: boolean; label?: unknown } => !!seat && typeof seat === 'object')
            .filter((seat) => seat.enabled !== false)
            .map((seat) => (typeof seat.label === 'string' ? seat.label : null))
            .filter((label): label is string => !!label);
    }

    if (layoutType === 'GRID_SEAT' && typeof attrs.seatLabel === 'string') {
        return [attrs.seatLabel];
    }

    return [];
}

function getSeatResourceMeta(resource: ResourceItemResponse): SeatResourceMeta | null {
    if (!resource.customAttributes || typeof resource.customAttributes !== 'object') return null;
    const attrs = resource.customAttributes as Record<string, unknown>;
    if (attrs.layoutType !== 'GRID_SEAT') return null;
    if (typeof attrs.seatLabel !== 'string' || typeof attrs.parentLayoutName !== 'string') return null;

    const row = typeof attrs.row === 'number' ? attrs.row : Number(attrs.row);
    const col = typeof attrs.col === 'number' ? attrs.col : Number(attrs.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return null;

    return {
        resourceId: resource.id,
        seatLabel: attrs.seatLabel,
        row,
        col,
        parentLayoutName: attrs.parentLayoutName,
        floor: resource.floor ?? null,
    };
}

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [selectedResource, setSelectedResource] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [reserveDate, setReserveDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [resourceName, setResourceName] = useState('');
    const [resourceType, setResourceType] = useState('ROOM');
    const [resourceCapacity, setResourceCapacity] = useState('1');
    const [resourceFloor, setResourceFloor] = useState('');
    const [resourceLocation, setResourceLocation] = useState('');
    const [isCreatingResource, setIsCreatingResource] = useState(false);
    const [useSeatLayout, setUseSeatLayout] = useState(false);
    const [autoCapacityFromSeats, setAutoCapacityFromSeats] = useState(true);
    const [createSeparateSeatResources, setCreateSeparateSeatResources] = useState(true);
    const [resourceViewFilter, setResourceViewFilter] = useState<'ALL' | 'SEAT' | 'OTHER'>('ALL');
    const [seatFloorFilter, setSeatFloorFilter] = useState<string>('ALL');
    const [seatLayoutFilter, setSeatLayoutFilter] = useState<string>('');
    const [seatLayout, setSeatLayout] = useState<SeatLayoutValue>({
        rows: 4,
        cols: 4,
        seats: Array.from({ length: 16 }, (_, i) => {
            const row = Math.floor(i / 4) + 1;
            const col = (i % 4) + 1;
            return { id: `R${row}-C${col}`, row, col, enabled: true, label: `${row}-${col}` };
        }),
    });

    const { data: facility, isLoading: facLoading } = useFacility(id);
    const { data: resourcesPage, isLoading: resLoading } = useResourcesByFacility(id);
    const createReservation = useCreateReservation();
    const createResource = useCreateResource();
    const queryClient = useQueryClient();
    const toast = useToast();

    const resources = useMemo(() => resourcesPage?.content ?? [], [resourcesPage]);
    const isLoading = facLoading || resLoading;
    const seatResources = useMemo(() => resources.map(getSeatResourceMeta).filter((meta): meta is SeatResourceMeta => meta !== null), [resources]);
    const seatFloors = useMemo(
        () => Array.from(new Set(seatResources.map((s) => (s.floor === null ? 'NONE' : String(s.floor))))),
        [seatResources]
    );
    const filteredByFloor = useMemo(
        () => seatResources.filter((s) => seatFloorFilter === 'ALL'
            || (seatFloorFilter === 'NONE' ? s.floor === null : String(s.floor) === seatFloorFilter)),
        [seatResources, seatFloorFilter]
    );
    const seatLayoutNames = useMemo(
        () => Array.from(new Set(filteredByFloor.map((s) => s.parentLayoutName))),
        [filteredByFloor]
    );
    const activeSeatResources = useMemo(
        () => filteredByFloor.filter((s) => !seatLayoutFilter || s.parentLayoutName === seatLayoutFilter),
        [filteredByFloor, seatLayoutFilter]
    );
    const selectedRes = resources.find((r: ResourceItemResponse) => r.id === selectedResource);
    const seatOptions = useMemo(() => getSeatOptions(selectedRes), [selectedRes]);
    const [selectedSeatLabel, setSelectedSeatLabel] = useState('');

    useEffect(() => {
        setSelectedSeatLabel('');
    }, [selectedResource]);

    useEffect(() => {
        if (seatOptions.length === 1) {
            setSelectedSeatLabel(seatOptions[0]);
        }
    }, [seatOptions]);

    useEffect(() => {
        if (!seatLayoutNames.length) {
            setSeatLayoutFilter('');
            return;
        }
        if (!seatLayoutFilter || !seatLayoutNames.includes(seatLayoutFilter)) {
            setSeatLayoutFilter(seatLayoutNames[0]);
        }
    }, [seatLayoutFilter, seatLayoutNames]);

    const handleReserve = () => {
        if (!selectedResource || !reserveDate || !startTime || !endTime) {
            toast.error('모든 항목을 입력해주세요.');
            return;
        }
        const validationError = validateReservationWindow(
            toIsoLocalDateTime(reserveDate, startTime),
            toIsoLocalDateTime(reserveDate, endTime),
        );
        if (validationError) {
            toast.error(validationError);
            return;
        }
        if (seatOptions.length > 1 && !selectedSeatLabel) {
            toast.error('좌석을 선택해 주세요.');
            return;
        }
        const finalSeatLabel = selectedSeatLabel || (seatOptions.length === 1 ? seatOptions[0] : undefined);
        createReservation.mutate(
            {
                resourceItemId: selectedResource,
                facilityId: id,
                seatLabel: finalSeatLabel,
                startTime: toIsoLocalDateTime(reserveDate, startTime),
                endTime: toIsoLocalDateTime(reserveDate, endTime),
            },
            {
                onSuccess: () => {
                    setShowModal(false);
                    setReserveDate('');
                    setStartTime('');
                    setEndTime('');
                    setSelectedSeatLabel('');
                    toast.success('예약 신청이 완료되었습니다!');
                },
                onError: (err: unknown) => {
                    toast.error(err instanceof Error ? err.message : '예약 중 오류가 발생했습니다.');
                },
            }
        );
    };

    const handleCreateResource = async () => {
        if (isCreatingResource) return;
        if (!resourceName.trim()) {
            toast.error('공간 이름을 입력해 주세요.');
            return;
        }

        const capacity = Number(resourceCapacity);
        if (!Number.isFinite(capacity) || capacity <= 0) {
            toast.error('수용 인원은 1명 이상이어야 합니다.');
            return;
        }

        const parsedFloor = resourceFloor.trim() ? Number(resourceFloor) : undefined;
        if (resourceFloor.trim() && !Number.isFinite(parsedFloor)) {
            toast.error('층수는 숫자로 입력해 주세요.');
            return;
        }

        const enabledSeats = seatLayout.seats.filter((seat) => seat.enabled);
        if (useSeatLayout && enabledSeats.length === 0) {
            toast.error('최소 1개 이상의 좌석을 활성화해 주세요.');
            return;
        }

        const finalCapacity = useSeatLayout && autoCapacityFromSeats ? enabledSeats.length : capacity;

        try {
            setIsCreatingResource(true);
            if (useSeatLayout && createSeparateSeatResources) {
                for (const seat of enabledSeats) {
                    await api.post<CommonResponse<ResourceItemResponse>>('/api/v1/resources', {
                        facilityId: id,
                        name: `${resourceName.trim()}-${seat.label}`,
                        resourceType: 'SEAT',
                        limitCapacity: 1,
                        floor: parsedFloor,
                        location: resourceLocation.trim() || undefined,
                        customAttributes: {
                            layoutType: 'GRID_SEAT',
                            parentLayoutName: resourceName.trim(),
                            seatId: seat.id,
                            seatLabel: seat.label,
                            row: seat.row,
                            col: seat.col,
                        },
                    });
                }
                await queryClient.invalidateQueries({ queryKey: ['resources', id] });
                toast.success(`좌석 ${enabledSeats.length}개를 개별 예약 리소스로 등록했습니다.`);
            } else {
                await createResource.mutateAsync({
                    facilityId: id,
                    name: resourceName.trim(),
                    resourceType,
                    limitCapacity: finalCapacity,
                    floor: parsedFloor,
                    location: resourceLocation.trim() || undefined,
                    customAttributes: useSeatLayout
                        ? {
                            layoutType: 'GRID',
                            rows: seatLayout.rows,
                            cols: seatLayout.cols,
                            seats: seatLayout.seats,
                        }
                        : undefined,
                });
                toast.success('구조/자리가 등록되었습니다.');
            }

            setResourceName('');
            setResourceType('ROOM');
            setResourceCapacity('1');
            setResourceFloor('');
            setResourceLocation('');
            setUseSeatLayout(false);
            setShowResourceForm(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : '구조 등록 중 오류가 발생했습니다.');
        } finally {
            setIsCreatingResource(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="skeleton h-8 w-48 rounded-xl" />
                <div className="rounded-lg p-6 space-y-3" style={{ borderBottom: '1px solid #EBEBED' }}>
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-3/4" />
                </div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-lg p-5 flex justify-between" style={{ borderBottom: '1px solid #EBEBED' }}>
                        <div className="space-y-2">
                            <div className="skeleton h-4 w-28" />
                            <div className="skeleton h-3 w-20" />
                        </div>
                        <div className="skeleton h-9 w-16 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center py-16">
                <HiOutlineBuildingOffice2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#D4D4D8' }} />
                <p className="text-sm font-medium" style={{ color: '#71717A' }}>시설 없음</p>
                <Link href="/facilities" className="mt-2 inline-block text-sm font-semibold" style={{ color: '#5E6AD2' }}>
                    목록으로 →
                </Link>
            </div>
        );
    }

    const immediateCount = resources.filter((r: ResourceItemResponse) =>
        !r.estimatedWaitMinutes || r.estimatedWaitMinutes === 0
    ).length;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Context Bar */}
            <div className="flex items-start gap-3 pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                <Link
                    href="/facilities"
                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5 transition-colors"
                    style={{ background: '#F4F4F5', color: '#71717A' }}
                >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1
                        className="text-lg font-bold leading-tight"
                        style={{ color: '#18181B', letterSpacing: '-0.02em' }}
                    >
                        {facility.name}
                    </h1>
                    {facility.address && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#71717A' }}>
                            <HiOutlineMapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                            <span className="truncate">{facility.address}</span>
                        </p>
                    )}
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[12px] mt-1" style={{ color: '#71717A' }}>
                    <span>공간 <strong style={{ color: '#18181B' }}>{resources.length}</strong></span>
                    <span style={{ color: '#D4D4D8' }}>|</span>
                    <span>즉시 <strong style={{ color: '#18181B' }}>{immediateCount}</strong></span>
                </div>
            </div>

            {/* Facility Info */}
            <div
                className="rounded-lg p-5"
                style={{ borderBottom: '1px solid #EBEBED' }}
            >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A1A1AA' }}>개요</p>
                <p className="text-sm leading-relaxed" style={{ color: '#3F3F46' }}>
                    {facility.description || '설명 없음'}
                </p>

                {/* 병원 카테고리일 때 진료과 설정 링크 */}
                {facility.category === 'HOSPITAL' && (
                    <Link
                        href={`/facilities/${id}/medical`}
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
                        style={{ background: '#FEF2F2', color: '#EF4444' }}
                    >
                        🏥 진료과 · 운영시간 설정
                    </Link>
                )}

                <div className="flex gap-6 mt-5 pt-4" style={{ borderTop: '1px solid #EBEBED' }}>
                    <div>
                        <p className="text-2xl font-bold tabular-nums" style={{ color: '#5E6AD2' }}>{resources.length}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>공간</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums" style={{ color: '#22C55E' }}>{immediateCount}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>즉시</p>
                    </div>
                </div>
            </div>

            {/* Resource Registration */}
            <div
                className="rounded-lg p-5"
                style={{ borderBottom: '1px solid #EBEBED' }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A1A1AA' }}>
                            설정
                        </p>
                        <h3 className="text-sm font-bold mt-1" style={{ color: '#18181B' }}>
                            공간 추가
                        </h3>
                    </div>
                    <button
                        onClick={() => setShowResourceForm((prev) => !prev)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        style={{ background: '#F0F0FF', color: '#4E5BBF' }}
                    >
                        <HiOutlinePlus className="w-4 h-4" />
                        {showResourceForm ? '닫기' : '추가'}
                    </button>
                </div>

                {showResourceForm && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>공간 이름</label>
                            <input
                                type="text"
                                placeholder="예: A회의실, 1인 좌석 12번"
                                value={resourceName}
                                onChange={(e) => setResourceName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>타입</label>
                            <select
                                value={resourceType}
                                onChange={(e) => setResourceType(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            >
                                <option value="ROOM">회의실</option>
                                <option value="HALL">강당</option>
                                <option value="SEMINAR">세미나실</option>
                                <option value="GYM">체육시설</option>
                                <option value="LAB">연구실</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>수용 인원</label>
                            <input
                                type="number"
                                min={1}
                                value={resourceCapacity}
                                onChange={(e) => setResourceCapacity(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                                disabled={useSeatLayout && autoCapacityFromSeats}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>층수(선택)</label>
                            <input
                                type="number"
                                value={resourceFloor}
                                onChange={(e) => setResourceFloor(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>위치 설명(선택)</label>
                            <input
                                type="text"
                                placeholder="예: 2층 북쪽 창가"
                                value={resourceLocation}
                                onChange={(e) => setResourceLocation(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: '#3F3F46' }}>
                                <input
                                    type="checkbox"
                                    checked={useSeatLayout}
                                    onChange={(e) => setUseSeatLayout(e.target.checked)}
                                />
                                좌석 배치(그리드) 설정 사용
                            </label>
                        </div>

                        {useSeatLayout && (
                            <div className="sm:col-span-2">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: '#3F3F46' }}>
                                    <input
                                        type="checkbox"
                                        checked={createSeparateSeatResources}
                                        onChange={(e) => setCreateSeparateSeatResources(e.target.checked)}
                                    />
                                    좌석별 개별 예약 리소스로 생성 (권장)
                                </label>
                                <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: '#3F3F46' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoCapacityFromSeats}
                                        onChange={(e) => setAutoCapacityFromSeats(e.target.checked)}
                                        disabled={createSeparateSeatResources}
                                    />
                                    활성 좌석 수를 수용 인원에 자동 반영
                                </label>
                                <SeatLayoutBuilder value={seatLayout} onChange={setSeatLayout} />
                            </div>
                        )}

                        <div className="sm:col-span-2 flex justify-end">
                            <button
                                onClick={handleCreateResource}
                                disabled={createResource.isPending || isCreatingResource}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                                style={{ background: '#5E6AD2', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }}
                            >
                                {createResource.isPending || isCreatingResource ? '등록 중...' : '구조 등록'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Resources */}
            <div
                className="rounded-lg overflow-hidden"
                style={{ borderBottom: '1px solid #EBEBED' }}
            >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #EBEBED' }}>
                    <h3 className="text-sm font-bold" style={{ color: '#18181B' }}>공간</h3>
                </div>

                <FacilitySeatQuickPicker
                    seatResources={seatResources}
                    seatFloors={seatFloors}
                    seatFloorFilter={seatFloorFilter}
                    onChangeSeatFloorFilter={setSeatFloorFilter}
                    seatLayoutNames={seatLayoutNames}
                    seatLayoutFilter={seatLayoutFilter}
                    onChangeSeatLayoutFilter={setSeatLayoutFilter}
                    activeSeatResources={activeSeatResources}
                    selectedResourceId={selectedResource}
                    onPickSeatResource={(resourceId, seatLabel) => {
                        setSelectedResource(resourceId);
                        setSelectedSeatLabel(seatLabel);
                        setShowModal(true);
                    }}
                />

                <FacilityResourceList
                    resources={resources}
                    resourceViewFilter={resourceViewFilter}
                    onChangeResourceViewFilter={setResourceViewFilter}
                    selectedResourceId={selectedResource}
                    onSelectResource={setSelectedResource}
                    onReserveResource={(resourceId) => {
                        setSelectedResource(resourceId);
                        setShowModal(true);
                    }}
                    typeLabels={typeLabels}
                    getSeatLayoutSummary={getSeatLayoutSummary}
                />
            </div>

            {/* Reserve CTA (when selected) */}
            {selectedResource && !showModal && (
                <div
                    className="fixed bottom-20 lg:bottom-6 left-1/2 lg:left-auto lg:right-24 -translate-x-1/2 lg:translate-x-0 z-40 w-[calc(100%-2rem)] lg:w-auto"
                >
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white"
                        style={{ background: '#5E6AD2', boxShadow: '0 8px 24px rgba(94,106,210,0.4)' }}
                    >
                        {selectedRes?.name} 예약
                    </button>
                </div>
            )}

            {/* Reserve Modal */}
            <FacilityReserveModal
                isOpen={showModal && !!selectedResource}
                selectedResourceName={selectedRes?.name}
                reserveDate={reserveDate}
                startTime={startTime}
                endTime={endTime}
                seatOptions={seatOptions}
                selectedSeatLabel={selectedSeatLabel}
                onClose={() => setShowModal(false)}
                onChangeReserveDate={setReserveDate}
                onChangeStartTime={setStartTime}
                onChangeEndTime={setEndTime}
                onChangeSelectedSeatLabel={setSelectedSeatLabel}
                onSubmit={handleReserve}
                isSubmitting={createReservation.isPending}
            />
        </div>
    );
}
