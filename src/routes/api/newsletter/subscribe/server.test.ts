import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	RESEND_API_KEY: 'test_api_key',
	RESEND_AUDIENCE_ID: 'test_audience_id'
}));

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				contacts: {
					create: vi.fn().mockResolvedValue({ error: null })
				}
			};
		})
	};
});

describe('Newsletter Subscribe API', () => {
	it('should return 400 for missing email', async () => {
		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			success: false,
			message: 'Invalid email address provided.'
		});
	});

	it('should return 400 for non-string email', async () => {
		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email: 123 })
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			success: false,
			message: 'Invalid email address provided.'
		});
	});

	it('should return 400 for invalid email format', async () => {
		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email: 'invalid-email' })
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			success: false,
			message: 'Invalid email address provided.'
		});
	});
});
