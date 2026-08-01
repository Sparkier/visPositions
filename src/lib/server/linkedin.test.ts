import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	LINKEDIN_CLIENT_ID: 'test_client_id',
	LINKEDIN_CLIENT_SECRET: 'test_client_secret',
	SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key'
}));

vi.mock('$env/dynamic/private', () => ({
	env: { LINKEDIN_ACCESS_TOKEN: 'env_fallback_token' }
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321'
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(() => ({ from: vi.fn() }))
}));

import {
	buildAuthUrl,
	exchangeCode,
	expiresAtFrom,
	getAccessToken,
	getRedirectUri,
	statusFromRow,
	EXPIRY_WARNING_DAYS,
	LINKEDIN_SCOPE,
	SITE_URL,
	type LinkedInTokenRow
} from './linkedin';

const NOW = new Date('2026-08-01T12:00:00.000Z');

function rowExpiringInDays(days: number): LinkedInTokenRow {
	return {
		access_token: 'stored_token',
		expires_at: new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
		updated_at: NOW.toISOString()
	};
}

describe('buildAuthUrl', () => {
	it('includes the client id, scope, state and callback for the given origin', () => {
		const url = new URL(buildAuthUrl('abc123', 'http://localhost:5173'));

		expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('client_id')).toBe('test_client_id');
		expect(url.searchParams.get('state')).toBe('abc123');
		expect(url.searchParams.get('scope')).toBe(LINKEDIN_SCOPE);
		expect(url.searchParams.get('redirect_uri')).toBe(
			'http://localhost:5173/api/linkedin/callback'
		);
	});

	it('falls back to the production origin', () => {
		expect(getRedirectUri()).toBe(`${SITE_URL}/api/linkedin/callback`);
	});
});

describe('expiresAtFrom', () => {
	it('turns the expires_in seconds into an absolute timestamp', () => {
		// LinkedIn's 60-day access token.
		expect(expiresAtFrom(5184000, NOW).toISOString()).toBe('2026-09-30T12:00:00.000Z');
	});
});

describe('statusFromRow', () => {
	it('reports a healthy token as not needing renewal', () => {
		const status = statusFromRow(rowExpiringInDays(45), NOW);

		expect(status.daysUntilExpiry).toBe(45);
		expect(status.expired).toBe(false);
		expect(status.needsRenewal).toBe(false);
	});

	it('needs renewal exactly at the warning boundary', () => {
		expect(statusFromRow(rowExpiringInDays(EXPIRY_WARNING_DAYS), NOW).needsRenewal).toBe(true);
		expect(statusFromRow(rowExpiringInDays(EXPIRY_WARNING_DAYS + 1), NOW).needsRenewal).toBe(false);
	});

	it('flags an expired token', () => {
		const status = statusFromRow(rowExpiringInDays(-1), NOW);

		expect(status.expired).toBe(true);
		expect(status.needsRenewal).toBe(true);
	});

	it('stays quiet when no token is stored yet, since the env fallback is in play', () => {
		const status = statusFromRow(null, NOW);

		expect(status.row).toBeNull();
		expect(status.daysUntilExpiry).toBeNull();
		expect(status.needsRenewal).toBe(false);
	});
});

describe('getAccessToken', () => {
	it('prefers the stored token', () => {
		expect(getAccessToken(statusFromRow(rowExpiringInDays(30), NOW))).toBe('stored_token');
	});

	it('falls back to the env var before the first reconnect', () => {
		expect(getAccessToken(statusFromRow(null, NOW))).toBe('env_fallback_token');
	});
});

describe('exchangeCode', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('posts the code with the client credentials and returns the token', async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ access_token: 'fresh_token', expires_in: 5184000 }), {
				status: 200
			})
		);

		const token = await exchangeCode('the_code', 'http://localhost:5173');

		expect(token).toEqual({ access_token: 'fresh_token', expires_in: 5184000 });

		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(url).toBe('https://www.linkedin.com/oauth/v2/accessToken');
		const body = init?.body as URLSearchParams;
		expect(body.get('grant_type')).toBe('authorization_code');
		expect(body.get('code')).toBe('the_code');
		expect(body.get('client_secret')).toBe('test_client_secret');
		expect(body.get('redirect_uri')).toBe('http://localhost:5173/api/linkedin/callback');
	});

	it('throws when LinkedIn rejects the exchange', async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response('{"error":"invalid_request"}', { status: 400 })
		);

		await expect(exchangeCode('bad_code')).rejects.toThrow('LinkedIn token exchange failed (400)');
	});

	it('throws when the response is missing the token', async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ scope: 'x' }), { status: 200 })
		);

		await expect(exchangeCode('the_code')).rejects.toThrow('unexpected payload');
	});
});
