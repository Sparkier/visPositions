import { error } from '@sveltejs/kit';
import { getDefaultExpirationDate } from '$lib/utils';

export const POST = async ({ locals: { supabase, safeGetSession }, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { title, description, contact, industry, education, keywords, expiration_date } =
		await request.json();

	if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 255) {
		throw error(400, 'Invalid title');
	}
	if (
		!description ||
		typeof description !== 'string' ||
		description.trim().length === 0 ||
		description.length > 5000
	) {
		throw error(400, 'Invalid description');
	}
	if (
		!contact ||
		typeof contact !== 'string' ||
		contact.trim().length === 0 ||
		contact.length > 255
	) {
		throw error(400, 'Invalid contact');
	}
	if (typeof industry !== 'boolean') {
		throw error(400, 'Invalid industry flag');
	}
	if (!['none', 'undergraduate', 'graduate', 'phd'].includes(education)) {
		throw error(400, 'Invalid education level');
	}
	if (keywords && !Array.isArray(keywords)) {
		throw error(400, 'Invalid keywords format');
	}
	if (
		expiration_date &&
		(typeof expiration_date !== 'string' || isNaN(Date.parse(expiration_date)))
	) {
		throw error(400, 'Invalid expiration date');
	}

	// Use provided expiration date or calculate default (3 months from now)
	const finalExpirationDate = expiration_date || getDefaultExpirationDate().toISOString();

	const { data: postData, error: postError } = await supabase
		.from('post')
		.insert({
			title,
			description,
			contact,
			industry,
			education,
			creator: session.user.email,
			created_at: new Date().toISOString(),
			expiration_date: finalExpirationDate
		})
		.select()
		.single();

	if (postError) {
		throw error(500, 'Failed to create post.');
	}

	if (!postData) {
		throw error(500, 'Post creation succeeded but no data returned.');
	}

	// Insert new keyword associations
	if (keywords && keywords.length > 0) {
		const { error: keywordError } = await supabase.from('postkeyword').insert(
			keywords.map((keyword: string) => ({
				post_id: postData.id,
				keyword_id: keyword
			}))
		);

		if (keywordError) {
			throw error(500, 'Failed to associate keywords.');
		}
	}

	return new Response('Post created', { status: 200 });
};
