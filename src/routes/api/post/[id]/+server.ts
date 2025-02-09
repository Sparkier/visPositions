export const DELETE = async ({ locals: { supabase, safeGetSession }, params }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('Unauthorized');
	}

	const { data: posts } = await supabase
		.from('post')
		.select()
		.eq('id', params.id)
		.eq('creator', session.user.email);
	if (!posts?.length) {
		throw new Error('Not found or unauthorized');
	}

	const { error } = await supabase.from('post').delete().eq('id', params.id);

	if (error) {
		throw new Error('Internal Server Error');
	}

	return new Response('Post deleted', { status: 200 });
};

export const PATCH = async ({ locals: { supabase, safeGetSession }, params, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('Unauthorized');
	}

	const data = await request.json();

	// Start a transaction to update both post and keywords
	const { error: postError } = await supabase
		.from('post')
		.update({
			title: data.title,
			description: data.description,
			contact: data.contact,
			industry: data.industry,
			education: data.education,
			vetted: data.vetted
		})
		.eq('id', params.id)
		.eq('creator', session.user.email);

	if (postError) {
		throw new Error('Internal Server Error');
	}

	// Delete existing keyword associations
	const { error: deleteError } = await supabase
		.from('postkeyword')
		.delete()
		.eq('post_id', params.id);

	if (deleteError) {
		throw new Error('Internal Server Error');
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
			throw new Error('Internal Server Error');
		}
	}

	return new Response('Post updated', { status: 200 });
};
