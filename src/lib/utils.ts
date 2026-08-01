import { timingSafeEqual } from 'node:crypto';

export function getDefaultExpirationDate(monthsToAdd: number = 3): Date {
	const defaultDate = new Date();
	defaultDate.setMonth(defaultDate.getMonth() + monthsToAdd);
	return defaultDate;
}

export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Performs a timing-safe comparison of two strings.
 */
export function safeCompare(a: string | null, b: string | null): boolean {
	if (a === null || b === null) return false;
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}
