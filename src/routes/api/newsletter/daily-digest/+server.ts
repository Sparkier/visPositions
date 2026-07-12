import {
	DAILY_DIGEST_SECRET_KEY,
	FROM_EMAIL,
	LINKEDIN_ACCESS_TOKEN,
	LINKEDIN_ORGANIZATION_ID,
	RESEND_API_KEY,
	RESEND_AUDIENCE_ID
} from '$env/static/private';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { escapeHtml } from '$lib/utils';
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
			.select('id, title, description, created_at')
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

		const siteUrl = 'https://vispositions.com';
		const subject = `Daily Digest: ${posts.length} New Position${posts.length > 1 ? 's' : ''} Posted`;

		// Common email body parts
		const textBodyHeader = `Here are the new positions posted on vispositions in the last 24 hours:\n\n`;
		const htmlBodyHeader = `<p>Here are the new positions posted on <a href="${siteUrl}">visPositions</a> in the last 24 hours:</p><ul>`;
		const postsText = posts
			.map(
				(post) =>
					`- ${post.title}\n   ${post.description?.substring(0, 100)}...\n   View: ${siteUrl}\n\n`
			)
			.join('');
		const linkedinText = posts.map((post) => `- ${post.title}\n`).join('');
		const postsHtml =
			posts
				.map((post) => {
					const safeTitle = escapeHtml(post.title);
					const safeDesc = post.description ? escapeHtml(post.description.substring(0, 100)) : '';
					return `<li><a href="${siteUrl}"><strong>${safeTitle}</strong></a><br/>${safeDesc}...</li>`;
				})
				.join('') + `</ul>`;

		const textBody =
			`${textBodyHeader}${postsText}` +
			`Visit ${siteUrl} to see more.\n\n` +
			`To unsubscribe from these emails, click here: {{{RESEND_UNSUBSCRIBE_URL}}}`;

		const linkedInBody = `${textBodyHeader}${linkedinText}\n\nVisit ${siteUrl} to see more.\n\n#job #visualization #dataviz`;

		const htmlBody =
			`${htmlBodyHeader}${postsHtml}` +
			`<p>Visit <a href="${siteUrl}">${siteUrl}</a> to see more.</p>` +
			`<p style="font-size: 0.8em; color: #666;">` +
			`To unsubscribe, <a href={{{RESEND_UNSUBSCRIBE_URL}}}>click here</a>.` +
			`</p>`;

		const broadcast = await resend.broadcasts.create({
			name: `Daily Digest ${new Date().toLocaleDateString()}`,
			from: FROM_EMAIL,
			subject: subject,
			text: textBody,
			html: htmlBody,
			audienceId: RESEND_AUDIENCE_ID
		});

		if (broadcast.error || !broadcast.data) {
			console.error('Error creating daily digest broadcast:', broadcast.error);
			throw new Error('Error creating daily digest broadcast');
		}

		const sendResult = await resend.broadcasts.send(broadcast.data.id);

		if (sendResult.error) {
			console.error('Error sending daily digest:', sendResult.error);
			throw new Error('Error sending daily digest');
		}

		// Post to LinkedIn
		if (LINKEDIN_ACCESS_TOKEN && LINKEDIN_ORGANIZATION_ID) {
			try {
				const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`
					},
					body: JSON.stringify({
						author: `urn:li:organization:${LINKEDIN_ORGANIZATION_ID}`,
						lifecycleState: 'PUBLISHED',
						specificContent: {
							'com.linkedin.ugc.ShareContent': {
								shareCommentary: {
									text: `${linkedInBody}`
								},
								shareMediaCategory: 'NONE'
							}
						},
						visibility: {
							'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
						}
					})
				});

				if (!linkedinRes.ok) {
					const errorText = await linkedinRes.text();
					console.error(`Error posting to LinkedIn (${linkedinRes.status}):`, errorText);
				} else {
					console.log('Successfully posted daily digest to LinkedIn.');
				}
			} catch (err) {
				console.error('Network error while posting to LinkedIn:', err);
			}
		} else {
			console.log('LinkedIn API credentials not configured. Skipping post to LinkedIn.');
		}

		console.log(`Daily digest process completed.`);
		return json({
			success: true,
			message: `Digest processed.`
		});
	} catch (error: unknown) {
		console.error('Error in daily digest endpoint:', error);
		throw new Error('Internal Server Error');
	}
};
