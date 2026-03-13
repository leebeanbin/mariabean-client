'use client';

import { useEffect, useMemo, useState } from 'react';

interface SeatCell {
    id: string;
    row: number;
    col: number;
    enabled: boolean;
    label: string;
}

export interface SeatLayoutValue {
    rows: number;
    cols: number;
    seats: SeatCell[];
}

interface SeatLayoutBuilderProps {
    value?: SeatLayoutValue;
    onChange: (value: SeatLayoutValue) => void;
}

function createGrid(rows: number, cols: number, prevSeats?: SeatCell[]): SeatCell[] {
    const prevMap = new Map((prevSeats ?? []).map((seat) => [seat.id, seat]));
    const next: SeatCell[] = [];
    for (let row = 1; row <= rows; row += 1) {
        for (let col = 1; col <= cols; col += 1) {
            const id = `R${row}-C${col}`;
            const prev = prevMap.get(id);
            next.push({ id, row, col, enabled: prev?.enabled ?? true, label: prev?.label ?? `${row}-${col}` });
        }
    }
    return next;
}

export default function SeatLayoutBuilder({ value, onChange }: SeatLayoutBuilderProps) {
    const [rows, setRows] = useState(value?.rows ?? 4);
    const [cols, setCols] = useState(value?.cols ?? 4);
    const [seats, setSeats] = useState<SeatCell[]>(() => createGrid(value?.rows ?? 4, value?.cols ?? 4, value?.seats));

    useEffect(() => {
        const nextSeats = createGrid(rows, cols, seats);
        setSeats(nextSeats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, cols]);

    useEffect(() => {
        onChange({ rows, cols, seats });
    }, [rows, cols, seats, onChange]);

    const enabledCount = useMemo(() => seats.filter((seat) => seat.enabled).length, [seats]);

    const toggleSeat = (seatId: string) => {
        setSeats((prev) =>
            prev.map((seat) => (seat.id === seatId ? { ...seat, enabled: !seat.enabled } : seat))
        );
    };

    return (
        <div className="mt-3 rounded-xl p-3.5" style={{ background: '#F9F9FB', border: '1px solid #E4E4E7' }}>
            <div className="flex flex-wrap items-end gap-2.5">
                <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#52525B' }}>행</label>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: '#fff', border: '1px solid #E4E4E7', color: '#18181B' }}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#52525B' }}>열</label>
                    <input
                        type="number"
                        min={1}
                        max={12}
                        value={cols}
                        onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: '#fff', border: '1px solid #E4E4E7', color: '#18181B' }}
                    />
                </div>
                <div className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(94,106,210,0.1)', color: '#5E6AD2' }}>
                    사용 가능 좌석 {enabledCount}개
                </div>
            </div>

            <div
                className="mt-3 grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
                {seats.map((seat) => (
                    <button
                        key={seat.id}
                        type="button"
                        onClick={() => toggleSeat(seat.id)}
                        className="h-8 rounded-md text-[11px] font-semibold transition-colors"
                        style={seat.enabled
                            ? { background: '#DCFCE7', color: '#166534', border: '1px solid #A7F3D0' }
                            : { background: '#F4F4F5', color: '#A1A1AA', border: '1px solid #E4E4E7' }
                        }
                        title={seat.enabled ? '클릭하면 비활성화' : '클릭하면 활성화'}
                    >
                        {seat.label}
                    </button>
                ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: '#A1A1AA' }}>
                좌석을 클릭해 사용 가능/불가를 토글하세요.
            </p>
        </div>
    );
}
