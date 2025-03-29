import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals: { supabase }, request }) => {
	// Basic email regex for validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	const { email } = await request.json();

	if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
		return json({ success: false, message: 'Invalid email address provided.' }, { status: 400 });
	}

	const { error } = await supabase.from('subscribers').insert({ email: email.toLowerCase() });

	if (error) {
		if (error.code === '23505') {
			throw new Error('Email already subscribed.');
		}
		throw new Error('Failed to subscribe.');
	}

	return json({ success: true, message: 'Successfully subscribed!' });
};
