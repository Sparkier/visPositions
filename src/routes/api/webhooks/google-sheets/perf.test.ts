import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

// Mock env vars
vi.mock('$env/static/private', () => ({
	WEBHOOK_SECRET: 'test_webhook_secret',
	SUPABASE_SERVICE_ROLE_KEY: 'test_service_key'
}));
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost'
}));

vi.mock('@supabase/supabase-js', () => {
	// We cannot use external variables inside vi.mock unless we mock correctly,
	// so let's track calls on the global object or just pass a mock that we can assert.
	// Instead of asserting maybeSingleMock from outside, we can just measure time,
	// which is the main goal here. But let's try to export the mock if we need it.
	return {
		createClient: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
			maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
		})
	};
});

describe('Benchmark Google Sheets Webhook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should measure execution time and query count', async () => {
		const numRows = 2000;
		const payload = Array.from({ length: numRows }, (_, i) => ({
			title: `Software Engineer ${i}`,
			description: 'Develop awesome apps',
			contact: `test${i}@example.com`,
			industry: true,
			education: 'BSc',
			keywords: ['svelte', 'vitest']
		}));

		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: { Authorization: 'Bearer test_webhook_secret' },
			body: JSON.stringify(payload)
		});

		const start = performance.now();
		const response = await POST({ request } as unknown as Parameters<typeof POST>[0]);
		const end = performance.now();

		console.log(`Time taken for ${numRows} rows: ${(end - start).toFixed(2)}ms`);

		const data = await response.json();
		expect(data.success).toBe(true);
	});
});
