import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: { value: string; isPositive: boolean };
    color?: string;
}

export default function StatCard({ title, value, icon, trend }: StatCardProps) {
    return (
        <div className="px-1 py-2">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-zinc-400">{icon}</span>
                <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: '#A1A1AA' }}>
                    {title}
                </span>
            </div>
            <p className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color: '#18181B' }}>
                {value}
            </p>
            {trend && (
                <p className="text-[11px] mt-0.5 font-medium"
                    style={{ color: trend.isPositive ? '#22C55E' : '#EF4444' }}>
                    {trend.isPositive ? '↑' : '↓'} {trend.value}
                </p>
            )}
        </div>
    );
}
