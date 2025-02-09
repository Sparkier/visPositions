import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		return { posts: [] };
	}

	const { data: posts } = await supabase
		.from('post')
		.select('*, keyword( id, title )')
		.eq('creator', session.user.email)
		.order('created_at', { ascending: false });

	const { data: keywords } = await supabase.from('keyword').select('*');

	return { posts: posts ?? [], keywords: keywords ?? [] };
};
