import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	WEBHOOK_SECRET: 'test_secret',
	SUPABASE_SERVICE_ROLE_KEY: 'test_service_key'
}));

// Mock $env/static/public
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost'
}));

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => {
	return {
		createClient: vi.fn().mockImplementation(() => {
			return {
				from: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				insert: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
				single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
			};
		})
	};
});

describe('Google Sheets Webhook POST', () => {
	it('should return 401 if missing authorization header', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			body: JSON.stringify([])
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 401 if invalid authorization header', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer wrong_secret' },
			body: JSON.stringify([])
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 400 if payload is not an array (object passed)', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_secret' },
			body: JSON.stringify({ title: 'Not an array' }) // <== Issue identified in instructions
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid payload format. Expected an array of rows.');
	});

	it('should process a valid payload array', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_secret' },
			body: JSON.stringify([
				{
					title: 'Software Engineer',
					description: 'Develop awesome apps',
					contact: 'test@example.com',
					industry: true,
					education: 'BSc',
					keywords: ['svelte', 'vitest']
				}
			])
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({
			success: true,
			insertedCount: 1,
			skippedCount: 0,
			errors: []
		});
	});
});
