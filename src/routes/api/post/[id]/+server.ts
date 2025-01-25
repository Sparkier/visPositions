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
	const { error } = await supabase
		.from('post')
		.update(data)
		.eq('id', params.id)
		.eq('creator', session.user.email);

	if (error) {
		throw new Error('Internal Server Error');
	}

	return new Response('Post updated', { status: 200 });
};
