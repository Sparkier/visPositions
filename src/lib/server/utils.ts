import { timingSafeEqual } from 'node:crypto';

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
