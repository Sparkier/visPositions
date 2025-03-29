import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const encodedEmail = url.searchParams.get('id');

	if (!encodedEmail) {
		throw error(400, 'Missing unsubscribe identifier.');
	}

	// Decode the email from Base64
	const email = Buffer.from(encodedEmail, 'base64').toString('utf-8');

	// Basic email validation just in case
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		console.warn(`Invalid email format after decoding: ${email}`);
		throw error(400, 'Invalid identifier format.');
	}

	// Delete the subscriber from the database
	const { error: deleteError } = await supabase
		.from('subscribers')
		.delete()
		.eq('email', email.toLowerCase()); // Match against lowercase email

	if (deleteError) {
		console.error('Error deleting subscriber:', deleteError);
		throw error(500, 'Failed to process unsubscribe request.');
	}

	// Redirect to a confirmation page
	throw redirect(303, '/newsletter/unsubscribed');
};
