'use client';

import { HiOutlineXMark } from 'react-icons/hi2';

interface FacilityReserveModalProps {
    isOpen: boolean;
    selectedResourceName?: string;
    reserveDate: string;
    startTime: string;
    endTime: string;
    seatOptions: string[];
    selectedSeatLabel: string;
    onClose: () => void;
    onChangeReserveDate: (value: string) => void;
    onChangeStartTime: (value: string) => void;
    onChangeEndTime: (value: string) => void;
    onChangeSelectedSeatLabel: (value: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export default function FacilityReserveModal({
    isOpen,
    selectedResourceName,
    reserveDate,
    startTime,
    endTime,
    seatOptions,
    selectedSeatLabel,
    onClose,
    onChangeReserveDate,
    onChangeStartTime,
    onChangeEndTime,
    onChangeSelectedSeatLabel,
    onSubmit,
    isSubmitting,
}: FacilityReserveModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-2xl p-4 sm:p-6 animate-slide-up max-h-[88vh] overflow-y-auto"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <h3 className="text-base font-bold" style={{ color: '#18181B' }}>예약 신청</h3>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
                        style={{ color: '#71717A' }}
                    >
                        <HiOutlineXMark className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="p-3.5 rounded-xl" style={{ background: 'rgba(94,106,210,0.08)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#5E6AD2' }}>선택 공간</p>
                        <p className="text-sm font-bold mt-0.5 truncate" style={{ color: '#18181B' }}>
                            {selectedResourceName}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>이용 날짜</label>
                        <input
                            type="date"
                            value={reserveDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => onChangeReserveDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                            style={{ background: '#F4F4F5', border: '1.5px solid transparent', color: '#18181B' }}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>시작 시간</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => onChangeStartTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: '#F4F4F5', border: '1.5px solid transparent', color: '#18181B' }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>종료 시간</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => onChangeEndTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: '#F4F4F5', border: '1.5px solid transparent', color: '#18181B' }}
                            />
                        </div>
                    </div>

                    {seatOptions.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>
                                좌석 선택
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                {seatOptions.map((seatLabel) => (
                                    <button
                                        key={seatLabel}
                                        type="button"
                                        onClick={() => onChangeSelectedSeatLabel(seatLabel)}
                                        className="px-2 py-2 rounded-lg text-xs font-semibold transition-all"
                                        style={selectedSeatLabel === seatLabel
                                            ? { background: '#5E6AD2', color: '#fff', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }
                                            : { background: '#F4F4F5', color: '#71717A' }}
                                    >
                                        {seatLabel}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100"
                            style={{ background: '#F4F4F5', color: '#52525B' }}
                        >
                            취소
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                            style={{ background: '#5E6AD2', boxShadow: '0 2px 8px rgba(94,106,210,0.3)' }}
                        >
                            {isSubmitting ? '처리 중...' : '예약 신청'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
