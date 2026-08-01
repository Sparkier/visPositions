import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { error } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({
	create: vi.fn().mockResolvedValue({ error: null })
}));

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	RESEND_API_KEY: 'test_api_key',
	RESEND_AUDIENCE_ID: 'test_audience_id'
}));

// Mock @sveltejs/kit
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => {
		const err = new Error(message);
		(err as Error & { status: number }).status = status;
		return err;
	}),
	json: vi.fn((data, init) => {
		const status = init?.status || 200;
		return new Response(JSON.stringify(data), { status });
	})
}));

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				contacts: {
					create: mocks.create
				}
			};
		})
	};
});

describe('Newsletter Subscribe API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.create.mockResolvedValue({ error: null });
	});

	it('should return 400 for missing email', async () => {
		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
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

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
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

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			success: false,
			message: 'Invalid email address provided.'
		});
	});

	it('should return 200 on successful subscription', async () => {
		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email: 'valid@example.com' })
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(mocks.create).toHaveBeenCalledWith({
			email: 'valid@example.com',
			audienceId: 'test_audience_id'
		});
		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			message: 'Successfully subscribed!'
		});
	});

	it('should throw a 500 error if resend API returns an error', async () => {
		mocks.create.mockResolvedValue({ error: { message: 'Some resend error' } });

		const request = new Request('http://localhost/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email: 'valid@example.com' })
		});

		await expect(POST({ request } as unknown as Parameters<typeof POST>[0])).rejects.toThrow('Failed to subscribe.');
		expect(error).toHaveBeenCalledWith(500, 'Failed to subscribe.');
	});
});
