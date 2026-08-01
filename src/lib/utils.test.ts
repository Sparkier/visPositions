import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { escapeHtml, getDefaultExpirationDate } from './utils';

describe('getDefaultExpirationDate', () => {
	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	it('adds 3 months by default', () => {
		vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
		const result = getDefaultExpirationDate();
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(3); // 0-indexed, so 3 is April
		expect(result.getDate()).toBe(15);
	});

	it('adds specified number of months', () => {
		vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
		const result = getDefaultExpirationDate(6);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(6); // 6 is July
		expect(result.getDate()).toBe(15);
	});

	it('handles crossing year boundary', () => {
		vi.setSystemTime(new Date('2024-11-15T12:00:00Z'));
		const result = getDefaultExpirationDate(3);
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(1); // 1 is February
		expect(result.getDate()).toBe(15);
	});

	it('handles negative months', () => {
		vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));
		const result = getDefaultExpirationDate(-2);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(2); // 2 is March
		expect(result.getDate()).toBe(15);
	});
});

describe('escapeHtml', () => {
	it('escapes & to &amp;', () => {
		expect(escapeHtml('a & b')).toBe('a &amp; b');
	});

	it('escapes < to &lt;', () => {
		expect(escapeHtml('a < b')).toBe('a &lt; b');
	});

	it('escapes > to &gt;', () => {
		expect(escapeHtml('a > b')).toBe('a &gt; b');
	});

	it('escapes " to &quot;', () => {
		expect(escapeHtml('a " b')).toBe('a &quot; b');
	});

	it("escapes \\' to &#039;", () => {
		expect(escapeHtml("a ' b")).toBe('a &#039; b');
	});

	it('does not escape normal text', () => {
		expect(escapeHtml('Hello World')).toBe('Hello World');
	});

	it('handles empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('escapes multiple characters', () => {
		expect(escapeHtml('<script>alert("XSS & \'/")</script>')).toBe(
			'&lt;script&gt;alert(&quot;XSS &amp; &#039;/&quot;)&lt;/script&gt;'
		);
	});
});
