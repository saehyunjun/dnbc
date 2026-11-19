// Eastern Time helpers. Uses Intl only, so Node and every browser agree, DST included.

const TZ = 'America/New_York';
export const DAY_START_HOUR = 6; // the channel day runs 06:00 to 06:00 ET

const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' });

/** Minutes ET is ahead of UTC at this instant (negative: -300 in winter, -240 in summer). */
export function etOffsetMinutes(ms: number): number {
	const part = offsetFmt.formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-05:00';
	const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part);
	if (!m) return -300;
	const sign = m[1] === '-' ? -1 : 1;
	return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Epoch ms for a wall-clock time in ET on a calendar date (YYYY-MM-DD). */
export function etToUtc(date: string, hour: number, minute = 0): number {
	const [y, mo, d] = date.split('-').map(Number);
	const guess = Date.UTC(y, mo - 1, d, hour, minute);
	// Two passes settle the offset across a DST change.
	let ms = guess - etOffsetMinutes(guess) * 60_000;
	ms = guess - etOffsetMinutes(ms) * 60_000;
	return ms;
}

const partsFmt = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
	weekday: 'short'
});

export interface EtParts {
	date: string; // YYYY-MM-DD calendar date in ET
	hour: number;
	minute: number;
	weekday: number; // 0 Sunday .. 6 Saturday
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function etParts(ms: number): EtParts {
	const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
	const hour = Number(p.hour) % 24;
	return {
		date: `${p.year}-${p.month}-${p.day}`,
		hour,
		minute: Number(p.minute),
		weekday: WEEKDAYS.indexOf(p.weekday)
	};
}

export function addDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const t = new Date(Date.UTC(y, m - 1, d + n));
	return t.toISOString().slice(0, 10);
}

/** The channel day an instant belongs to: before 06:00 ET it is still yesterday's. */
export function channelDay(ms: number): string {
	const p = etParts(ms);
	return p.hour < DAY_START_HOUR ? addDays(p.date, -1) : p.date;
}

export function weekdayOf(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "7:42" style ET clock text. */
export function etClock(ms: number): string {
	const p = etParts(ms);
	const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
	return `${h12}:${String(p.minute).padStart(2, '0')} ${p.hour < 12 ? 'AM' : 'PM'}`;
}
