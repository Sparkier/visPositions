import { timingSafeEqual } from 'node:crypto';

/**
 * Securely compares two strings to prevent timing attacks.
 * Uses `node:crypto.timingSafeEqual` under the hood.
 *
 * @param expected The expected string (e.g., the secret).
 * @param actual The actual string provided (e.g., the header value).
 * @returns true if the strings match perfectly, false otherwise.
 */
export function timingSafeStringEqual(expected: string, actual: string | null): boolean {
	if (actual === null) {
		return false;
	}

	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual);

	if (expectedBuffer.length !== actualBuffer.length) {
		// To prevent timing attacks based on length, we still do a comparison
		// even if lengths differ, comparing the expected against itself.
		// We use a throw-away operation.
		timingSafeEqual(expectedBuffer, expectedBuffer);
		return false;
	}

	return timingSafeEqual(expectedBuffer, actualBuffer);
}
