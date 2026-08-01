import {
	LINKEDIN_CLIENT_ID,
	LINKEDIN_CLIENT_SECRET,
	SUPABASE_SERVICE_ROLE_KEY
} from '$env/static/private';
// Read dynamically so `LINKEDIN_ACCESS_TOKEN` can be deleted from Vercel after
// the first reconnect without breaking the build.
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

// The token row is protected by RLS with no policies, so only the service role
// can read or write it.
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Canonical domain — the apex 308-redirects here. */
export const SITE_URL = 'https://www.vispositions.com';

/** Scope the LinkedIn app is approved for. Posting to the org page needs this one. */
export const LINKEDIN_SCOPE = 'w_organization_social';

/** Warn this many days before the access token expires. */
export const EXPIRY_WARNING_DAYS = 7;

/** Ties the OAuth callback back to the admin-initiated flow. */
export const STATE_COOKIE = 'linkedin_oauth_state';

const AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const ACCESS_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

const TOKEN_ROW_ID = 1;

export type LinkedInTokenRow = {
	access_token: string;
	expires_at: string;
	updated_at: string;
};

export type TokenStatus = {
	/** Null when no token has been stored yet — see `getAccessToken`. */
	row: LinkedInTokenRow | null;
	/** Days until expiry, rounded down. Null when there is no stored token. */
	daysUntilExpiry: number | null;
	expired: boolean;
	/** True when a stored token is expired or inside the warning window. */
	needsRenewal: boolean;
};

export function getRedirectUri(origin: string = SITE_URL): string {
	return `${origin}/api/linkedin/callback`;
}

export function getReconnectUrl(origin: string = SITE_URL): string {
	return `${origin}/private/linkedin`;
}

export function buildAuthUrl(state: string, origin: string = SITE_URL): string {
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: LINKEDIN_CLIENT_ID,
		redirect_uri: getRedirectUri(origin),
		state,
		scope: LINKEDIN_SCOPE
	});
	return `${AUTHORIZATION_URL}?${params.toString()}`;
}

type AccessTokenResponse = {
	access_token: string;
	expires_in: number;
};

/**
 * Trades an authorization code for an access token. LinkedIn only issues
 * refresh tokens to approved Marketing Developer Platform partners, so the
 * response here is expected to carry just a 60-day access token.
 */
export async function exchangeCode(
	code: string,
	origin: string = SITE_URL
): Promise<AccessTokenResponse> {
	const res = await fetch(ACCESS_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: getRedirectUri(origin),
			client_id: LINKEDIN_CLIENT_ID,
			client_secret: LINKEDIN_CLIENT_SECRET
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`LinkedIn token exchange failed (${res.status}): ${body}`);
	}

	const data = (await res.json()) as Partial<AccessTokenResponse>;

	if (!data.access_token || !data.expires_in) {
		throw new Error('LinkedIn token exchange returned an unexpected payload.');
	}

	return { access_token: data.access_token, expires_in: data.expires_in };
}

export function expiresAtFrom(expiresIn: number, now: Date = new Date()): Date {
	return new Date(now.getTime() + expiresIn * 1000);
}

export async function saveToken(token: AccessTokenResponse): Promise<void> {
	const { error } = await supabaseAdmin.from('linkedin_token').upsert(
		{
			id: TOKEN_ROW_ID,
			access_token: token.access_token,
			expires_at: expiresAtFrom(token.expires_in).toISOString(),
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'id' }
	);

	if (error) {
		throw new Error(`Could not store the LinkedIn token: ${error.message}`);
	}
}

async function readTokenRow(): Promise<LinkedInTokenRow | null> {
	const { data, error } = await supabaseAdmin
		.from('linkedin_token')
		.select('access_token, expires_at, updated_at')
		.eq('id', TOKEN_ROW_ID)
		.maybeSingle();

	if (error) {
		console.error('Error reading the stored LinkedIn token:', error);
		return null;
	}

	return data;
}

/**
 * The access token to post with. Falls back to the `LINKEDIN_ACCESS_TOKEN` env
 * var while no token has been stored yet, so posting keeps working between
 * deploying this and the first reconnect.
 */
export function getAccessToken(status: TokenStatus): string | null {
	return status.row?.access_token || env.LINKEDIN_ACCESS_TOKEN || null;
}

export function statusFromRow(row: LinkedInTokenRow | null, now: Date = new Date()): TokenStatus {
	if (!row) {
		// Nothing stored yet means the env fallback is still in play. That token
		// has its own unknown expiry, so there is nothing to warn about until it
		// is rejected — don't nag daily before the first reconnect.
		return { row: null, daysUntilExpiry: null, expired: false, needsRenewal: false };
	}

	const msUntilExpiry = new Date(row.expires_at).getTime() - now.getTime();
	const daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24));
	const expired = msUntilExpiry <= 0;

	return {
		row,
		daysUntilExpiry,
		expired,
		needsRenewal: expired || daysUntilExpiry <= EXPIRY_WARNING_DAYS
	};
}

export async function getTokenStatus(): Promise<TokenStatus> {
	return statusFromRow(await readTokenRow());
}
