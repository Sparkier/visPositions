import { error, text } from '@sveltejs/kit';

export const DELETE = async ({ locals: { supabase, safeGetSession }, params }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { data: posts } = await supabase
		.from('post')
		.select()
		.eq('id', params.id)
		.eq('creator', session.user.email);
	if (!posts?.length) {
		throw error(404, 'Not found or unauthorized');
	}

	const { error: deleteError } = await supabase.from('post').delete().eq('id', params.id);

	if (deleteError) {
		throw error(500, 'Internal Server Error');
	}

	return text('Post deleted');
};

export const PATCH = async ({ locals: { supabase, safeGetSession }, params, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();

	const { title, description, contact, industry, education, keywords, expiration_date } = data;

	if (
		title !== undefined &&
		(!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 255)
	) {
		throw error(400, 'Invalid title');
	}
	if (
		description !== undefined &&
		(!description ||
			typeof description !== 'string' ||
			description.trim().length === 0 ||
			description.length > 5000)
	) {
		throw error(400, 'Invalid description');
	}
	if (
		contact !== undefined &&
		(!contact || typeof contact !== 'string' || contact.trim().length === 0 || contact.length > 255)
	) {
		throw error(400, 'Invalid contact');
	}
	if (industry !== undefined && typeof industry !== 'boolean') {
		throw error(400, 'Invalid industry flag');
	}
	if (
		education !== undefined &&
		!['none', 'undergraduate', 'graduate', 'phd'].includes(education)
	) {
		throw error(400, 'Invalid education level');
	}
	if (keywords !== undefined && !Array.isArray(keywords)) {
		throw error(400, 'Invalid keywords format');
	}
	if (
		expiration_date !== undefined &&
		(typeof expiration_date !== 'string' || isNaN(Date.parse(expiration_date)))
	) {
		throw error(400, 'Invalid expiration date');
	}

	// Start a transaction to update both post and keywords
	// Always include expiration_date in the update
	const updateData = {
		title: data.title,
		description: data.description,
		contact: data.contact,
		industry: data.industry,
		education: data.education,
		expiration_date: data.expiration_date
	};

	const { error: postError } = await supabase
		.from('post')
		.update(updateData)
		.eq('id', params.id)
		.eq('creator', session.user.email);

	if (postError) {
		throw error(500, 'Internal Server Error');
	}

	// Delete existing keyword associations
	const { error: deleteError } = await supabase
		.from('postkeyword')
		.delete()
		.eq('post_id', params.id);

	if (deleteError) {
		throw error(500, 'Internal Server Error');
	}

	// Insert new keyword associations
	if (data.keywords.length > 0) {
		const { error: keywordError } = await supabase.from('postkeyword').insert(
			data.keywords.map((keyword: string) => ({
				post_id: params.id,
				keyword_id: keyword
			}))
		);

		if (keywordError) {
			throw error(500, 'Internal Server Error');
		}
	}

	return text('Post updated');
};
