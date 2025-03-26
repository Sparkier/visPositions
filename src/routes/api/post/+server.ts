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

	const { data, error } = await supabase
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
