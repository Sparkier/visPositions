import { ADMIN_EMAIL, FROM_EMAIL, RESEND_API_KEY, WEBHOOK_SECRET } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { timingSafeStringEqual } from '$lib/server/auth';

const resend = new Resend(RESEND_API_KEY);

export async function POST({ request }) {
	const authHeader = request.headers.get('Authorization');

	if (!timingSafeStringEqual(`Bearer ${WEBHOOK_SECRET}`, authHeader)) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const payload = await request.json();

		await resend.emails.send({
			from: FROM_EMAIL,
			to: ADMIN_EMAIL,
			subject: 'New Post Submitted',
			text: `A new post was submitted: \n\nTitle: ${payload.title}\n\nContent: ${payload.description}`
		});

		return json({ success: true });
	} catch (error) {
		console.error('Webhook error:', error);
		return json({ success: false }, { status: 500 });
	}
}
