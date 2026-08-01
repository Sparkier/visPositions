import { ADMIN_EMAIL } from '$env/static/private';
import { buildAuthUrl, STATE_COOKIE } from '$lib/server/linkedin';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { safeGetSession }, cookies, url }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	if (session.user.email !== ADMIN_EMAIL) {
		throw error(403, 'Forbidden');
	}

	const state = crypto.randomUUID();

	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 10
	});

	throw redirect(302, buildAuthUrl(state, url.origin));
};
