import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { createClient } from '@supabase/supabase-js';

// Mock env vars
vi.mock('$env/static/private', () => ({
	WEBHOOK_SECRET: 'test_webhook_secret',
	SUPABASE_SERVICE_ROLE_KEY: 'test_service_key'
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost'
}));

// Mock supabase client
vi.mock('@supabase/supabase-js', () => {
	const mockClient = {
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
	};
	return {
		createClient: vi.fn().mockReturnValue(mockClient)
	};
});

describe('Google Sheets Webhook API', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the default single mock implementation
		const mockClient = vi.mocked(createClient) as unknown as () => {
			single: {
				mockResolvedValue: (arg: unknown) => void;
				mockResolvedValueOnce: (arg: unknown) => void;
			};
		};
		if (mockClient && mockClient()) {
			mockClient().single.mockResolvedValue({ data: { id: 1 }, error: null });
		}
	});

	it('should return 401 if missing authorization header', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			body: JSON.stringify([])
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 401 if invalid authorization header', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer wrong_secret' },
			body: JSON.stringify([])
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 400 if payload is not an array (object passed)', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_webhook_secret' },
			body: JSON.stringify({ title: 'Not an array' })
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid payload format. Expected an array of rows.');
	});

	it('should process a valid payload array', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_webhook_secret' },
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

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({
			success: true,
			insertedCount: 1,
			skippedCount: 0,
			errors: []
		});
	});

	it('should return errors for rows missing required fields', async () => {
		const payload = [
			{
				title: '', // Missing title
				description: 'A test description',
				contact: 'test@example.com'
			},
			{
				title: 'Missing description',
				description: '', // Missing description
				contact: 'test@example.com'
			},
			{
				title: 'Missing contact',
				description: 'A test description',
				contact: '' // Missing contact
			},
			{
				// Missing everything except an invalid contact field (not even title)
				contact: 'no-title@example.com'
			},
			{
				title: 'Valid Post',
				description: 'Valid Description',
				contact: 'valid@example.com'
			}
		];

		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer test_webhook_secret'
			},
			body: JSON.stringify(payload)
		});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.insertedCount).toBe(1);
		expect(data.skippedCount).toBe(0);
		expect(data.errors).toHaveLength(4);

		expect(data.errors[0]).toEqual({
			title: '(no title)',
			error: 'Missing required fields (title, description, or contact)'
		});

		expect(data.errors[1]).toEqual({
			title: 'Missing description',
			error: 'Missing required fields (title, description, or contact)'
		});

		expect(data.errors[2]).toEqual({
			title: 'Missing contact',
			error: 'Missing required fields (title, description, or contact)'
		});

		expect(data.errors[3]).toEqual({
			title: '(no title)',
			error: 'Missing required fields (title, description, or contact)'
		});
	});

	it('should handle database error during post insertion', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_webhook_secret' },
			body: JSON.stringify([
				{
					title: 'DB Error Post',
					description: 'Develop awesome apps',
					contact: 'test@example.com'
				}
			])
		});

		// Mock the single method to return an error for this test
		const mockClient = (
			vi.mocked(createClient) as unknown as () => {
				single: { mockResolvedValueOnce: (arg: unknown) => void };
			}
		)();
		mockClient.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Test DB Error', code: 'P0001' }
		});

		// Suppress console.error during this test
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({
			success: true,
			insertedCount: 0,
			skippedCount: 0,
			errors: [
				{
					title: 'DB Error Post',
					error: 'Insert failed: Test DB Error (code: P0001)'
				}
			]
		});
		expect(consoleSpy).toHaveBeenCalledWith('Failed to create post:', {
			message: 'Test DB Error',
			code: 'P0001'
		});

		consoleSpy.mockRestore();
	});

	it('should return 500 if an internal error occurs (catch block)', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_webhook_secret' }
		});

		// Force request.json to throw an error
		request.json = vi.fn().mockRejectedValue(new Error('Simulated JSON parsing error'));

		// Suppress console.error during this test
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toEqual({
			error: 'Internal Server Error',
			details: 'Error: Simulated JSON parsing error'
		});

		consoleSpy.mockRestore();
	});
});
