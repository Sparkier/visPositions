import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { getTokenStatus, type TokenStatus } from '$lib/server/linkedin';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	ADMIN_EMAIL: 'admin@example.com',
	DAILY_DIGEST_SECRET_KEY: 'test_secret_key',
	FROM_EMAIL: 'test@example.com',
	LINKEDIN_CLIENT_ID: 'test_client_id',
	LINKEDIN_CLIENT_SECRET: 'test_client_secret',
	LINKEDIN_ORGANIZATION_ID: 'test_org_id',
	RESEND_API_KEY: 'test_api_key',
	RESEND_AUDIENCE_ID: 'test_audience_id',
	SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key'
}));

const sendEmail = vi.fn().mockResolvedValue({ error: null });

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				broadcasts: {
					create: vi.fn().mockResolvedValue({ data: { id: 'test_id' }, error: null }),
					send: vi.fn().mockResolvedValue({ error: null })
				},
				emails: {
					send: (...args: unknown[]) => sendEmail(...args)
				}
			};
		})
	};
});

vi.mock('$lib/server/linkedin', async (importOriginal) => {
	// Keep the pure helpers, stub only the Supabase-backed read.
	const actual = await importOriginal<typeof import('$lib/server/linkedin')>();
	return { ...actual, getTokenStatus: vi.fn() };
});

vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'http://localhost:54321' }));

vi.mock('$env/dynamic/private', () => ({ env: { LINKEDIN_ACCESS_TOKEN: 'env_fallback_token' } }));

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ from: vi.fn() })) }));

const healthyToken: TokenStatus = {
	row: {
		access_token: 'stored_token',
		expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
		updated_at: new Date().toISOString()
	},
	daysUntilExpiry: 45,
	expired: false,
	needsRenewal: false
};

const expiringToken: TokenStatus = {
	...healthyToken,
	daysUntilExpiry: 3,
	needsRenewal: true
};

function digestRequest(token = 'test_secret_key') {
	return new Request('http://localhost/api/newsletter/daily-digest', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` }
	});
}

function supabaseWithPosts(posts: unknown[]) {
	return {
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		order: vi.fn().mockResolvedValue({ data: posts, error: null })
	};
}

function callDigest(request: Request, supabase: unknown) {
	return POST({ request, locals: { supabase } } as unknown as Parameters<typeof POST>[0]);
}

describe('Daily Digest API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getTokenStatus).mockResolvedValue(healthyToken);
	});

	it('should return 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST'
		});

		const response = await callDigest(request, {});
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});

	it('should return 401 if Authorization header is invalid', async () => {
		const response = await callDigest(digestRequest('wrong_key'), {});
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});

	it('should return 200 with no new posts message if there are no new posts', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const response = await callDigest(digestRequest(), supabaseWithPosts([]));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ message: 'No new posts to send.' });
		expect(consoleSpy).toHaveBeenCalledWith('No newly vetted posts found in the last 24 hours.');

		consoleSpy.mockRestore();
	});

	it('does not email about the token while it is healthy', async () => {
		await callDigest(digestRequest(), supabaseWithPosts([]));

		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('warns the admin when the token is close to expiring', async () => {
		vi.mocked(getTokenStatus).mockResolvedValue(expiringToken);

		await callDigest(digestRequest(), supabaseWithPosts([]));

		expect(sendEmail).toHaveBeenCalledTimes(1);
		const mail = sendEmail.mock.calls[0][0];
		expect(mail.to).toBe('admin@example.com');
		expect(mail.text).toContain('expires in 3 days');
		expect(mail.text).toContain('/private/linkedin');
	});

	it('warns even on a day with no new posts', async () => {
		vi.mocked(getTokenStatus).mockResolvedValue({ ...expiringToken, expired: true });
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const response = await callDigest(digestRequest(), supabaseWithPosts([]));

		expect(await response.json()).toEqual({ message: 'No new posts to send.' });
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail.mock.calls[0][0].text).toContain('has expired');

		consoleSpy.mockRestore();
	});

	it('warns immediately when LinkedIn rejects the token', async () => {
		const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('revoked', { status: 401 })));

		await callDigest(
			digestRequest(),
			supabaseWithPosts([
				{
					id: 1,
					title: 'A job',
					description: 'A description',
					created_at: new Date().toISOString()
				}
			])
		);

		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail.mock.calls[0][0].text).toContain('HTTP 401');

		vi.unstubAllGlobals();
		consoleLog.mockRestore();
		consoleError.mockRestore();
	});
});
