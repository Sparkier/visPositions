export const POST = async ({ locals: { supabase, safeGetSession }, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('Unauthorized');
	}

	const { title, description, contact, industry, education, keywords, expiration_date } =
		await request.json();

	// Use provided expiration date or calculate default (3 months from now)
	const finalExpirationDate =
		expiration_date ||
		(() => {
			const defaultDate = new Date();
			defaultDate.setMonth(defaultDate.getMonth() + 3);
			return defaultDate.toISOString();
		})();

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
		throw new Error('Failed to create post.');
	}

	if (!postData) {
		throw new Error('Post creation succeeded but no data returned.');
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
			throw new Error('Failed to associate keywords.');
		}
	}

	return new Response('Post created', { status: 200 });
};
