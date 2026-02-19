/**
 * Parses a "Floating" ISO string (e.g., "2026-02-20T09:00:00.000Z") as if it belongs to the Tenant's Timezone.
 * Returns a standard Date object representing the absolute time.
 * 
 * Example:
 * API returns "09:00:00.000Z" (meaning 9 AM in Madrid).
 * We want a Date object that is "09:00 Madrid".
 */
export function parseSlotInTenantTimezone(isoSlot: string, tenantTimezone: string): Date {
    // 1. Strip the 'Z' or offset to treat it as local/floating time "2026-02-20T09:00:00.000"
    const floatingTime = isoSlot.replace(/(Z|[+-]\d{2}:\d{2})$/, '');

    // 2. We need to find the offset of 'tenantTimezone' for this specific date/time.
    // We create a Date object assuming UTC first to get the components
    const dateComponents = new Date(floatingTime + 'Z');

    // 3. Use Intl to format this instant in the Target Timezone to see the "wall clock" difference
    // Actually, checking offset is trickier. 
    // Easier approach: Use the string "YYYY-MM-DDTHH:mm:ss" and create a Date that produces that string in the target TZ.

    // Workaround: We want to find a Timestamp T such that T.toLocaleString(..., {timeZone: tenantTimezone}) matches floatingTime.
    // This is iterative or requires external lib. 
    // BUT, we can just construct the string with the correct offset if we know it.

    // Let's get the offset of the Tenant Timezone for the approximate date.
    const getOffset = (d: Date, tz: string) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'longOffset',
        }).formatToParts(d);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        // format: "GMT-05:00" or "GMT+01:00"
        return offsetPart ? offsetPart.value.replace('GMT', '') : '+00:00';
    };

    // We use the floating time (as UTC) to guess the date part for offset lookup
    // It's close enough (within 24h) to determine DST status usually.
    const approxDate = new Date(floatingTime + 'Z');
    const offset = getOffset(approxDate, tenantTimezone);

    // 4. Construct valid ISO with offset: "2026-02-20T09:00:00.000+01:00"
    const validIso = `${floatingTime}${offset}`;

    return new Date(validIso);
}

export function formatTimeInUserTimezone(date: Date): string {
    return date.toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
