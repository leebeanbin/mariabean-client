'use client';

import type { ComponentType } from 'react';

type CategoryControlItem = {
    key: string;
    label: string;
    color?: string;
    icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

type CategoryControlBarProps = {
    items: CategoryControlItem[];
    selectedKey: string;
    onSelect: (key: string) => void;
    className?: string;
};

export default function CategoryControlBar({
    items,
    selectedKey,
    onSelect,
    className,
}: CategoryControlBarProps) {
    const selected = items.find(item => item.key === selectedKey);

    return (
        <div className={className}>
            <div
                className="rounded-2xl px-3 py-3"
                style={{ background: '#FAFAFA', border: '1px solid #F0F0F0' }}
            >
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: '#A1A1AA' }}>
                        카테고리
                    </p>
                    <p className="text-[11px] font-medium" style={{ color: selected?.color ?? '#71717A' }}>
                        {selected?.label ?? '전체'}
                    </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {items.map(item => {
                        const Icon = item.icon;
                        const isActive = item.key === selectedKey;
                        return (
                            <button
                                key={item.key}
                                onClick={() => onSelect(item.key)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                                style={isActive
                                    ? { background: item.color ?? '#5E6AD2', color: '#fff' }
                                    : { background: '#fff', border: '1px solid #E4E4E7', color: '#52525B' }
                                }
                                type="button"
                            >
                                {Icon && (
                                    <Icon
                                        className="w-3.5 h-3.5"
                                        style={{ color: isActive ? '#fff' : item.color ?? '#A1A1AA' }}
                                    />
                                )}
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
