'use client';

interface OpenNowBadgeProps {
    openNow: boolean | null;
    className?: string;
}

export default function OpenNowBadge({ openNow, className = '' }: OpenNowBadgeProps) {
    if (openNow === true) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}
                style={{ background: '#F0FDF4', color: '#16A34A' }}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                운영 중
            </span>
        );
    }
    if (openNow === false) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}
                style={{ background: '#FEF2F2', color: '#DC2626' }}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                운영 종료
            </span>
        );
    }
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}
            style={{ background: '#F4F4F5', color: '#71717A' }}
        >
            시간 미등록
        </span>
    );
}
