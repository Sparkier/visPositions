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

		const siteUrl = 'https://vispositions.com';
		const subject = `Daily Digest: ${posts.length} New Position${posts.length > 1 ? 's' : ''} Posted`;

		// Common email body parts
		const textBodyHeader = `Here are the new positions posted on vispositions in the last 24 hours:\n\n`;
		const htmlBodyHeader = `<p>Here are the new positions posted on <a href="${siteUrl}">visPositions</a> in the last 24 hours:</p><ul>`;
		let postsText = '';
		let postsHtml = '';

		posts.forEach((post) => {
			const postLink = `${siteUrl}`;
			postsText += `- ${post.title}\n   ${post.description?.substring(0, 100)}...\n   View: ${postLink}\n\n`;
			postsHtml += `<li><a href="${postLink}"><strong>${post.title}</strong></a><br/>${post.description?.substring(0, 100)}...</li>`;
		});
		postsHtml += `</ul>`;

		let emailsSent = 0;
		let emailErrors = 0;

		for (const subscriber of subscribers) {
			const email = subscriber.email;
			if (!email) continue; // Skip if email is missing for some reason

			// Encode email for the unsubscribe link using Node.js Buffer
			const encodedEmail = Buffer.from(email).toString('base64');
			const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?id=${encodedEmail}`;

			const textBody =
				`${textBodyHeader}${postsText}` +
				`Visit ${siteUrl} to see more.\n\n` +
				`To unsubscribe from these emails, click here: ${unsubscribeUrl}`;

			const htmlBody =
				`${htmlBodyHeader}${postsHtml}` +
				`<p>Visit <a href="${siteUrl}">${siteUrl}</a> to see more.</p>` +
				`<p style="font-size: 0.8em; color: #666;">` +
				`To unsubscribe, <a href="${unsubscribeUrl}">click here</a>.` +
				`</p>`;

			try {
				await resend.emails.send({
					from: 'info@vispositions.com', // Ensure this is verified in Resend
					to: email,
					subject: subject,
					text: textBody,
					html: htmlBody
				});
				emailsSent++;
			} catch (emailError) {
				console.error(`Failed to send email to ${email}:`, emailError);
				emailErrors++;
			}
		}

		console.log(`Daily digest process completed. Sent: ${emailsSent}, Failed: ${emailErrors}`);
		return json({
			success: true,
			message: `Digest processed. Sent: ${emailsSent}, Failed: ${emailErrors}`,
			emailsSent,
			emailErrors
		});
	} catch (error: unknown) {
		console.error('Error in daily digest endpoint:', error);
		throw new Error('Internal Server Error');
	}
};
