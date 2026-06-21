import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	DAILY_DIGEST_SECRET_KEY: 'test_secret_key',
	FROM_EMAIL: 'test@example.com',
	LINKEDIN_ACCESS_TOKEN: 'test_linkedin_token',
	LINKEDIN_ORGANIZATION_ID: 'test_org_id',
	RESEND_API_KEY: 'test_api_key',
	RESEND_AUDIENCE_ID: 'test_audience_id'
}));

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				broadcasts: {
					create: vi.fn().mockResolvedValue({ data: { id: 'test_id' }, error: null }),
					send: vi.fn().mockResolvedValue({ error: null })
				}
			};
		})
	};
});

describe('Daily Digest API', () => {
	it('should return 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST'
		});

		const response = await POST({ request, locals: { supabase: {} } } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});

	it('should return 401 if Authorization header is invalid', async () => {
		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer wrong_key'
			}
		});

		const response = await POST({ request, locals: { supabase: {} } } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});
});
