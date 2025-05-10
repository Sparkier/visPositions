import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		return { posts: [], keywords: [], isAdmin: false };
	}

	const userEmail = session.user.email;
	const isAdmin = userEmail === 'alex@a13x.io';

	let query = supabase
		.from('post')
		.select('*, keyword( id, title )')
		.order('created_at', { ascending: false });

	if (isAdmin) {
		query = query.or(`vetted.eq.false,creator.eq.${userEmail}`);
	} else {
		query = query.eq('creator', userEmail);
	}

	const { data: posts } = await query;
	const { data: keywords } = await supabase.from('keyword').select('*');

	return { posts: posts ?? [], keywords: keywords ?? [], isAdmin };
};
