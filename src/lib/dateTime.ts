export function toIsoLocalDateTime(date: string, time: string): string {
    return `${date}T${time}:00`;
}

export function isThirtyMinuteAligned(value: string): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const minutes = date.getMinutes();
    return (minutes === 0 || minutes === 30) && date.getSeconds() === 0;
}

export function validateReservationWindow(start: string, end: string): string | null {
    if (!start || !end) return '시작/종료 시간을 모두 입력해 주세요.';
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return '시간 형식이 올바르지 않습니다.';
    }
    if (startDate >= endDate) return '시작 시간은 종료 시간보다 빨라야 합니다.';
    if (!isThirtyMinuteAligned(start) || !isThirtyMinuteAligned(end)) {
        return '예약 시간은 30분 단위(00분/30분)로 입력해 주세요.';
    }
    return null;
}
