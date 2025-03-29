import { DAILY_DIGEST_SECRET_KEY, RESEND_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import type { RequestHandler } from './$types';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ locals: { supabase }, request }) => {
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${DAILY_DIGEST_SECRET_KEY}`) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Fetch posts vetted in the last 24 hours
		const twentyFourHoursAgo = new Date();
		twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
		const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();
		const { data: posts, error: postsError } = await supabase
			.from('post')
			.select('id, title, description, created_at') // Select fields needed for the email
			.eq('vetted', true)
			.gte('vetted_at', twentyFourHoursAgoISO)
			.order('vetted_at', { ascending: false });

		if (postsError) {
			console.error('Error fetching vetted posts:', postsError);
			throw new Error('Error fetching posts');
		}

		if (!posts || posts.length === 0) {
			console.log('No newly vetted posts found in the last 24 hours.');
			return json({ message: 'No new posts to send.' }, { status: 200 });
		}

		// Fetch subscribers
		const { data: subscribers, error: subscriberError } = await supabase
			.from('subscribers')
			.select('email');

		if (subscriberError) {
			console.error('Error fetching subscribers:', subscriberError);
			throw new Error('Error fetching subscribers');
		}

		if (!subscribers || subscribers.length === 0) {
			console.log('No subscribers found.');
			return json({ message: 'No subscribers to send to.' }, { status: 200 });
		}

		const emails = subscribers.map((sub) => sub.email);

		// Compose Email Content
		const siteUrl = 'https://vispositions.com';
		const subject = `Daily Digest: ${posts.length} New Position${posts.length > 1 ? 's' : ''} Posted`;

		let textBody = `Here were some new positions posted on visPositions in the last 24 hours:\n\n`;
		let htmlBody = `<p>Here were some new positions posted on <a href="${siteUrl}">visPositions</a> in the last 24 hours:</p><ul>`;

		posts.forEach((post) => {
			textBody += `- ${post.title}\n   ${post.description?.substring(0, 100)}...`;
			htmlBody += `<li><a href="${siteUrl}"><strong>${post.title}</strong></a><br/>${post.description?.substring(0, 100)}...</li>`;
		});

		htmlBody += `</ul><p>Visit <a href="${siteUrl}">${siteUrl}</a> to see more.</p>`;
		textBody += `Visit ${siteUrl} to see more.`;

		// Send Email
		try {
			await resend.emails.send({
				from: 'info@vispositions.com',
				to: emails,
				subject: subject,
				text: textBody,
				html: htmlBody
			});
			console.log(
				`Daily digest sent successfully to ${emails.length} subscribers for ${posts.length} posts.`
			);
			return json({ success: true, message: `Digest sent to ${emails.length} subscribers.` });
		} catch (emailError) {
			console.error('Error sending daily digest email:', emailError);
			throw new Error('Error sending email');
		}
	} catch (error: unknown) {
		console.error('Error in daily digest endpoint:', error);
		throw new Error('Internal Server Error');
	}
};
