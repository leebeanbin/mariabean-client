import type { ReservationStatus, PaymentStatus } from '@/lib/types';

const statusConfig: Record<string, { label: string; dot: string; color: string }> = {
    PENDING:   { label: '대기중',   dot: '#EAB308', color: '#92400E' },
    CONFIRMED: { label: '확정',     dot: '#22C55E', color: '#166534' },
    CANCELLED: { label: '취소',     dot: '#EF4444', color: '#991B1B' },
    EXPIRED:   { label: '만료',     dot: '#A1A1AA', color: '#52525B' },
    READY:     { label: '결제대기', dot: '#5E6AD2', color: '#3730A3' },
    APPROVED:  { label: '결제완료', dot: '#22C55E', color: '#166534' },
    FAILED:    { label: '결제실패', dot: '#EF4444', color: '#991B1B' },
};

interface StatusBadgeProps {
    status: ReservationStatus | PaymentStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const c = statusConfig[status] ?? { label: status, dot: '#A1A1AA', color: '#52525B' };
    const isPulsing = status === 'PENDING' || status === 'READY';

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: c.color }}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPulsing ? 'animate-pulse-dot' : ''}`}
                style={{ background: c.dot }}
            />
            {c.label}
        </span>
    );
}
