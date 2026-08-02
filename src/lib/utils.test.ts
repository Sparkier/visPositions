import { describe, it, expect } from 'vitest';
import { escapeHtml } from './utils';

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
