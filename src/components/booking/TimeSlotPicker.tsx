import type { TimeSlot } from '@/lib/types';

interface Props {
    slots: TimeSlot[];
    selectedStart: string | null;
    selectedEnd: string | null;
    onSelect: (start: string, end: string) => void;
}

export default function TimeSlotPicker({ slots, selectedStart, selectedEnd, onSelect }: Props) {
    const handleClick = (slot: TimeSlot) => {
        if (!slot.available) return;
        onSelect(slot.startTime, slot.endTime);
    };

    const isSelected = (slot: TimeSlot) =>
        slot.startTime === selectedStart && slot.endTime === selectedEnd;

    if (!slots.length) {
        return (
            <div className="text-center py-8 text-sm" style={{ color: '#71717A' }}>
                이 날짜에 이용 가능한 시간이 없습니다.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {slots.map((slot) => {
                const selected = isSelected(slot);
                return (
                    <button
                        key={slot.startTime}
                        onClick={() => handleClick(slot)}
                        disabled={!slot.available}
                        className="px-2 py-3 rounded-xl text-[13px] font-medium transition-all active:scale-95 flex flex-col items-center gap-0.5"
                        style={{
                            background: selected
                                ? '#5E6AD2'
                                : slot.available
                                ? '#fff'
                                : '#F4F4F5',
                            color: selected
                                ? '#fff'
                                : slot.available
                                ? '#18181B'
                                : '#D4D4D8',
                            border: selected
                                ? '1.5px solid #5E6AD2'
                                : slot.available
                                ? '1.5px solid #E4E4E7'
                                : '1.5px solid #F4F4F5',
                            cursor: slot.available ? 'pointer' : 'not-allowed',
                            boxShadow: selected ? '0 2px 8px rgba(94,106,210,0.3)' : 'none',
                        }}
                    >
                        <span>{slot.startTime}</span>
                        <span className="text-[10px]" style={{ color: selected ? 'rgba(255,255,255,0.7)' : '#A1A1AA' }}>
                            ~{slot.endTime}
                        </span>
                        {!slot.available && (
                            <span className="text-[9px] mt-0.5" style={{ color: '#D4D4D8' }}>예약됨</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
