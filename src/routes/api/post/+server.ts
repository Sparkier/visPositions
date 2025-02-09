export const POST = async ({ locals: { supabase, safeGetSession }, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('Unauthorized');
	}

	const { title, description, contact, industry, education, keywords } = await request.json();

	const { data, error } = await supabase
		.from('post')
		.insert({
			title,
			description,
			contact,
			industry,
			education,
			creator: session.user.email,
			created_at: new Date().toISOString()
		})
		.select();

	if (error) {
		throw new Error('Internal Server Error');
	}

	// Insert new keyword associations
	if (keywords.length > 0) {
		const { error: keywordError } = await supabase.from('postkeyword').insert(
			keywords.map((keyword: string) => ({
				post_id: data[0].id,
				keyword_id: keyword
			}))
		);

		if (keywordError) {
			throw new Error('Internal Server Error');
		}
	}

	return new Response('Post created', { status: 200 });
};
