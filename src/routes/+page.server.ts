import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: posts } = await supabase
		.from('post')
		.select('*, keyword( id, title )')
		.eq('vetted', true)
		.order('created_at', { ascending: false });

	return { posts: posts ?? [] };
};
