import { ADMIN_EMAIL, FROM_EMAIL, RESEND_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';

const resend = new Resend(RESEND_API_KEY);

export async function POST({ request }) {
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
