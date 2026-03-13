'use client';

export interface SeatResourceMeta {
    resourceId: string;
    seatLabel: string;
    row: number;
    col: number;
    parentLayoutName: string;
    floor: number | null;
}

interface FacilitySeatQuickPickerProps {
    seatResources: SeatResourceMeta[];
    seatFloors: string[];
    seatFloorFilter: string;
    onChangeSeatFloorFilter: (value: string) => void;
    seatLayoutNames: string[];
    seatLayoutFilter: string;
    onChangeSeatLayoutFilter: (value: string) => void;
    activeSeatResources: SeatResourceMeta[];
    selectedResourceId: string | null;
    onPickSeatResource: (resourceId: string, seatLabel: string) => void;
}

export default function FacilitySeatQuickPicker({
    seatResources,
    seatFloors,
    seatFloorFilter,
    onChangeSeatFloorFilter,
    seatLayoutNames,
    seatLayoutFilter,
    onChangeSeatLayoutFilter,
    activeSeatResources,
    selectedResourceId,
    onPickSeatResource,
}: FacilitySeatQuickPickerProps) {
    if (seatResources.length === 0) return null;

    return (
        <div className="px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid #F0F1F3', background: '#F9F9FB' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#52525B' }}>좌석 배치 빠른 선택</p>

            <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                    onClick={() => onChangeSeatFloorFilter('ALL')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                    style={seatFloorFilter === 'ALL'
                        ? { background: '#5E6AD2', color: '#fff' }
                        : { background: '#E4E4E7', color: '#52525B' }}
                >
                    전체 층
                </button>
                {seatFloors.map((floor) => (
                    <button
                        key={floor}
                        onClick={() => onChangeSeatFloorFilter(floor)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={seatFloorFilter === floor
                            ? { background: '#5E6AD2', color: '#fff' }
                            : { background: '#E4E4E7', color: '#52525B' }}
                    >
                        {floor === 'NONE' ? '층 미지정' : `${floor}층`}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {seatLayoutNames.map((name) => (
                    <button
                        key={name}
                        onClick={() => onChangeSeatLayoutFilter(name)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={seatLayoutFilter === name
                            ? { background: '#22C55E', color: '#fff' }
                            : { background: '#DCFCE7', color: '#166534' }}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {activeSeatResources.length > 0 && (() => {
                const maxRow = Math.max(...activeSeatResources.map((s) => s.row));
                const maxCol = Math.max(...activeSeatResources.map((s) => s.col));
                const seatMap = new Map(activeSeatResources.map((s) => [`${s.row}-${s.col}`, s]));

                return (
                    <div className="overflow-x-auto">
                        <div
                            className="grid gap-1.5 min-w-[280px]"
                            style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(40px, 1fr))` }}
                        >
                            {Array.from({ length: maxRow * maxCol }, (_, idx) => {
                                const row = Math.floor(idx / maxCol) + 1;
                                const col = (idx % maxCol) + 1;
                                const seat = seatMap.get(`${row}-${col}`);
                                if (!seat) {
                                    return <div key={`${row}-${col}`} className="h-8 rounded-md" style={{ background: '#F4F4F5' }} />;
                                }
                                const isPicked = selectedResourceId === seat.resourceId;
                                return (
                                    <button
                                        key={seat.resourceId}
                                        type="button"
                                        onClick={() => onPickSeatResource(seat.resourceId, seat.seatLabel)}
                                        className="h-8 rounded-md text-[11px] font-semibold transition-all"
                                        style={isPicked
                                            ? { background: '#5E6AD2', color: '#fff', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }
                                            : { background: '#DCFCE7', color: '#166534', border: '1px solid #A7F3D0' }}
                                    >
                                        {seat.seatLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
