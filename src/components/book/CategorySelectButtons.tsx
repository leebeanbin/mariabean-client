'use client';

type CategoryButtonItem = {
    key: string;
    label: string;
    color?: string;
};

type CategorySelectButtonsProps = {
    items: CategoryButtonItem[];
    selectedKey: string;
    onSelect: (key: string) => void;
    className?: string;
    compact?: boolean;
};

export default function CategorySelectButtons({
    items,
    selectedKey,
    onSelect,
    className,
    compact = true,
}: CategorySelectButtonsProps) {
    return (
        <div className={className}>
            {items.map(item => {
                const isActive = selectedKey === item.key;
                const activeColor = item.color ?? '#5E6AD2';
                return (
                    <button
                        key={item.key}
                        onClick={() => onSelect(item.key)}
                        className={compact
                            ? 'flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold'
                            : 'flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-semibold'
                        }
                        style={isActive
                            ? { background: activeColor, color: '#fff' }
                            : { background: '#fff', border: '1px solid #E4E4E7', color: '#52525B' }
                        }
                        type="button"
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
