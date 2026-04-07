/**
 * Parses a "Floating" ISO string (e.g., "2026-02-20T09:00:00.000Z") as if it belongs to the Tenant's Timezone.
 * Returns a standard Date object representing the absolute time.
 * 
 * Example:
 * API returns "09:00:00.000Z" (meaning 9 AM in Madrid).
 * We want a Date object that is "09:00 Madrid".
 */
export function parseSlotInTenantTimezone(isoSlot: string, tenantTimezone: string): Date {
    const floatingTime = isoSlot.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
    const approxDate = new Date(floatingTime + 'Z');

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tenantTimezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(approxDate);

    const tzHour = parts.find(p => p.type === 'hour')?.value ?? '0';
    const tzMinute = parts.find(p => p.type === 'minute')?.value ?? '0';

    const utcHour = approxDate.getUTCHours();
    const utcMinute = approxDate.getUTCMinutes();

    const offsetMinutes = (parseInt(tzHour) * 60 + parseInt(tzMinute)) - (utcHour * 60 + utcMinute);

    const absoluteTs = approxDate.getTime() - offsetMinutes * 60 * 1000;
    return new Date(absoluteTs);
}

export function formatTimeInUserTimezone(date: Date): string {
    return date.toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
