export const POST = async ({ locals: { supabase, safeGetSession }, request }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('Unauthorized');
	}

	const { title, description, contact } = await request.json();

	const { error } = await supabase.from('post').insert({
		title,
		description,
		contact,
		creator: session.user.email,
		created_at: new Date().toISOString()
	});

	if (error) {
		throw new Error('Internal Server Error');
	}

	return new Response('Post created', { status: 200 });
};
