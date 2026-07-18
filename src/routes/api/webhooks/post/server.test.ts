import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	RESEND_API_KEY: 'test_api_key',
	WEBHOOK_SECRET: 'test_secret',
	FROM_EMAIL: 'test_from@example.com',
	ADMIN_EMAIL: 'test_admin@example.com'
}));

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				emails: {
					send: vi.fn().mockResolvedValue({ error: null })
				}
			};
		})
	};
});

describe('Post Webhook API', () => {
	it('should return 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/webhooks/post', {
			method: 'POST',
			body: JSON.stringify({ title: 'Test', description: 'Test desc' })
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 401 if Authorization header is incorrect', async () => {
		const request = new Request('http://localhost/api/webhooks/post', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer wrong_secret'
			},
			body: JSON.stringify({ title: 'Test', description: 'Test desc' })
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 200 and success: true for valid request with correct auth', async () => {
		const request = new Request('http://localhost/api/webhooks/post', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer test_secret'
			},
			body: JSON.stringify({ title: 'Test', description: 'Test desc' })
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ success: true });
	});

	it('should return 500 and success: false if an error occurs during processing', async () => {
		const request = new Request('http://localhost/api/webhooks/post', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer test_secret'
			},
			body: JSON.stringify({ title: 'Test', description: 'Test desc' })
		});

		// Mock request.json() to throw an error
		request.json = vi.fn().mockRejectedValue(new Error('Simulated processing error'));

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toEqual({ success: false });
		expect(consoleErrorSpy).toHaveBeenCalledWith('Webhook error:', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});
});
