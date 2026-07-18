import { ADMIN_EMAIL } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals: { supabase, safeGetSession }, params }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	if (session.user.email !== ADMIN_EMAIL) {
		throw error(403, 'Forbidden');
	}

	const postId = params.id;

	if (!postId) {
		throw error(400, 'Post ID is required');
	}

	const { error: updateError } = await supabase
		.from('post')
		.update({ vetted: true, vetted_at: new Date().toISOString() })
		.eq('id', postId);

	if (updateError) {
		console.error('Error approving post:', updateError);
		throw error(500, 'Internal Server Error');
	}

	return json({ success: true, message: 'Post approved' });
};
