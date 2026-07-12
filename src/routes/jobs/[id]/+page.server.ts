import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: post } = await supabase
		.from('post')
		.select('*, keyword( id, title )')
		.eq('id', params.id)
		.eq('vetted', true)
		.single();

	if (!post) {
		throw error(404, 'Position not found');
	}

	return { post };
};
