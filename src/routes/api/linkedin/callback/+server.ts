import { exchangeCode, saveToken, STATE_COOKIE } from '$lib/server/linkedin';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RECONNECT_PAGE = '/private/linkedin';

/**
 * LinkedIn redirects the browser here after consent, so this route cannot
 * require a session — the single-use `state` cookie set by `/api/linkedin/auth`
 * is what ties the callback back to an admin-initiated flow.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const expectedState = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/' });

	const linkedInError = url.searchParams.get('error');
	if (linkedInError) {
		const description = url.searchParams.get('error_description') ?? linkedInError;
		console.error('LinkedIn denied the authorization request:', description);
		throw redirect(303, `${RECONNECT_PAGE}?error=${encodeURIComponent(description)}`);
	}

	const state = url.searchParams.get('state');
	if (!expectedState || state !== expectedState) {
		console.error('LinkedIn callback state mismatch.');
		throw redirect(303, `${RECONNECT_PAGE}?error=state_mismatch`);
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(303, `${RECONNECT_PAGE}?error=missing_code`);
	}

	try {
		await saveToken(await exchangeCode(code, url.origin));
	} catch (err) {
		console.error('Could not complete the LinkedIn reconnect:', err);
		throw redirect(303, `${RECONNECT_PAGE}?error=exchange_failed`);
	}

	throw redirect(303, `${RECONNECT_PAGE}?connected=1`);
};
