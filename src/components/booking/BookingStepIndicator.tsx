interface Step {
    label: string;
}

interface Props {
    steps: Step[];
    currentStep: number; // 0-indexed
}

export default function BookingStepIndicator({ steps, currentStep }: Props) {
    return (
        <div className="flex items-center gap-0">
            {steps.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                    <div key={i} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all"
                                style={{
                                    background: done ? '#5E6AD2' : active ? '#5E6AD2' : '#E4E4E7',
                                    color: done || active ? '#fff' : '#A1A1AA',
                                }}
                            >
                                {done ? '✓' : i + 1}
                            </div>
                            <span
                                className="text-[11px] mt-1.5 font-medium whitespace-nowrap"
                                style={{ color: active ? '#5E6AD2' : done ? '#52525B' : '#A1A1AA' }}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className="h-px w-12 sm:w-16 mx-1 mb-5 transition-all"
                                style={{ background: done ? '#5E6AD2' : '#E4E4E7' }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
