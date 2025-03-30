import { RESEND_API_KEY, RESEND_AUDIENCE_ID } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import type { RequestHandler } from './$types';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	// Basic email regex for validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	const { email } = await request.json();

	if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
		return json({ success: false, message: 'Invalid email address provided.' }, { status: 400 });
	}

	const subscribeResult = await resend.contacts.create({
		email: email.toLowerCase(),
		audienceId: RESEND_AUDIENCE_ID
	});

	if (subscribeResult.error) {
		throw new Error('Failed to subscribe.');
	}

	return json({ success: true, message: 'Successfully subscribed!' });
};
