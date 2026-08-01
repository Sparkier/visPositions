import { ADMIN_EMAIL } from '$env/static/private';
import { getTokenStatus } from '$lib/server/linkedin';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	if (session.user.email !== ADMIN_EMAIL) {
		throw error(403, 'Forbidden');
	}

	const { row, daysUntilExpiry, expired, needsRenewal } = await getTokenStatus();

	// Never send the token itself to the browser.
	return {
		connected: row !== null,
		expiresAt: row?.expires_at ?? null,
		updatedAt: row?.updated_at ?? null,
		daysUntilExpiry,
		expired,
		needsRenewal
	};
};
