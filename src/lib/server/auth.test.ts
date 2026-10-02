import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from './auth';

describe('timingSafeStringEqual', () => {
	it('should return true for identical strings', () => {
		expect(timingSafeStringEqual('secret_token', 'secret_token')).toBe(true);
	});

	it('should return false for different strings of the same length', () => {
		expect(timingSafeStringEqual('secret_token', 'wrong__token')).toBe(false);
	});

	it('should return false for different strings of different lengths', () => {
		expect(timingSafeStringEqual('secret', 'very_long_wrong_token')).toBe(false);
	});

	it('should return false if actual string is null', () => {
		// Ensure it doesn't throw when null is passed
		expect(timingSafeStringEqual('secret_token', null)).toBe(false);
	});

	it('should return false for substring matches', () => {
		expect(timingSafeStringEqual('secret', 'sec')).toBe(false);
		expect(timingSafeStringEqual('secret', 'secrett')).toBe(false);
	});
});
