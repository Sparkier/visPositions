import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$env/static/private', () => ({
	WEBHOOK_SECRET: 'test_webhook_secret',
	SUPABASE_SERVICE_ROLE_KEY: 'test_supabase_service_role_key'
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
}));

vi.mock('@supabase/supabase-js', () => {
    return {
        createClient: vi.fn().mockImplementation(() => {
            return {};
        })
    };
});

describe('Google Sheets Webhook API', () => {
	it('should return 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			body: JSON.stringify([{ title: 'test' }])
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});

	it('should return 401 if Authorization header is invalid', async () => {
		const request = new Request('http://localhost/api/webhooks/google-sheets', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer wrong_secret'
			},
			body: JSON.stringify([{ title: 'test' }])
		});

		const response = await POST({ request } as any);

		expect(response.status).toBe(401);
		expect(await response.text()).toBe('Unauthorized');
	});
});
