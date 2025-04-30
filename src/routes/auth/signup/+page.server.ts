import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
	signup: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!email || !password || !confirmPassword) {
			return fail(400, { message: 'All fields are required.', incorrect: true });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.', incorrect: true });
		}

		const { error } = await supabase.auth.signUp({
			email,
			password
		});

		if (error) {
			redirect(303, '/auth/error');
		} else {
			return { success: true, message: 'Please check your email to confirm your account.' };
		}
	}
};
