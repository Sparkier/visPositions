import {
	ADMIN_EMAIL,
	DAILY_DIGEST_SECRET_KEY,
	FROM_EMAIL,
	LINKEDIN_ORGANIZATION_ID,
	RESEND_API_KEY,
	RESEND_AUDIENCE_ID
} from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { escapeHtml } from '$lib/utils';
import { getAccessToken, getReconnectUrl, getTokenStatus } from '$lib/server/linkedin';
import type { RequestHandler } from './$types';
import { timingSafeStringEqual } from '$lib/server/auth';

const resend = new Resend(RESEND_API_KEY);

/**
 * Nudges the admin to reconnect. LinkedIn only grants refresh tokens to
 * approved Marketing Developer Platform partners, so renewal is manual and
 * this daily mail is what keeps it from being forgotten.
 */
async function sendTokenWarning(reason: string) {
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: ADMIN_EMAIL,
			subject: 'visPositions: LinkedIn token needs renewing',
			text:
				`${reason}\n\n` +
				`Reconnect here: ${getReconnectUrl()}\n\n` +
				`Until then the daily digest email still goes out, but nothing is posted to LinkedIn.`
		});
	} catch (err) {
		console.error('Could not send the LinkedIn token warning email:', err);
	}
}

export const POST: RequestHandler = async ({ locals: { supabase }, request }) => {
	const authHeader = request.headers.get('Authorization');
	if (!timingSafeStringEqual(`Bearer ${DAILY_DIGEST_SECRET_KEY}`, authHeader)) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	// Checked before the no-new-posts return below, so quiet days still warn.
	const tokenStatus = await getTokenStatus();
	if (tokenStatus.needsRenewal) {
		await sendTokenWarning(
			tokenStatus.expired
				? 'The LinkedIn access token has expired.'
				: `The LinkedIn access token expires in ${tokenStatus.daysUntilExpiry} days.`
		);
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
			throw error(500, 'Error fetching posts');
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
		const { postsText, linkedinText, postsHtmlItems } = posts.reduce(
			(acc, post) => {
				const shortDesc = post.description ? post.description.substring(0, 100) : '';
				acc.postsText += `- ${post.title}\n   ${shortDesc}...\n   View: ${siteUrl}/jobs/${post.id}\n\n`;
				acc.linkedinText += `- ${post.title}\n`;
				const safeTitle = escapeHtml(post.title);
				const safeDesc = shortDesc ? escapeHtml(shortDesc) : '';
				acc.postsHtmlItems += `<li><a href="${siteUrl}/jobs/${post.id}"><strong>${safeTitle}</strong></a><br/>${safeDesc}...</li>`;
				return acc;
			},
			{ postsText: '', linkedinText: '', postsHtmlItems: '' }
		);
		const postsHtml = postsHtmlItems + `</ul>`;

		const textBody =
			`${textBodyHeader}${postsText}` +
			`Visit ${siteUrl} to see more.\n\n` +
			`Know someone who'd be a good fit? Forward them this email or share ${siteUrl} — it helps more people find these roles.\n\n` +
			`To unsubscribe from these emails, click here: {{{RESEND_UNSUBSCRIBE_URL}}}`;

		const linkedInPs = `PS: This is a side project I maintain in my spare time — now in its second year. If you find it useful, a like or repost genuinely helps more people discover it. 🙏`;

		const linkedInBody = `${textBodyHeader}${linkedinText}\n\nVisit ${siteUrl} to see more.\n\n${linkedInPs}\n\n#dataviz #datavisualization #hiring #datavizjobs #informationdesign`;

		const htmlBody =
			`${htmlBodyHeader}${postsHtml}` +
			`<p>Visit <a href="${siteUrl}">${siteUrl}</a> to see more.</p>` +
			`<p>Know someone who'd be a good fit? Forward them this email or share ` +
			`<a href="${siteUrl}">${siteUrl}</a> — it helps more people find these roles.</p>` +
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
			throw error(500, 'Error creating daily digest broadcast');
		}

		const sendResult = await resend.broadcasts.send(broadcast.data.id);

		if (sendResult.error) {
			console.error('Error sending daily digest:', sendResult.error);
			throw error(500, 'Error sending daily digest');
		}

		// Post to LinkedIn
		const linkedinToken = getAccessToken(tokenStatus);
		if (linkedinToken && LINKEDIN_ORGANIZATION_ID) {
			try {
				const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${linkedinToken}`
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

					// A rejected token can also mean early revocation, which the
					// expiry check above would not have caught.
					if (
						(linkedinRes.status === 401 || linkedinRes.status === 403) &&
						!tokenStatus.needsRenewal
					) {
						await sendTokenWarning(
							`LinkedIn rejected the access token (HTTP ${linkedinRes.status}) while posting the daily digest.`
						);
					}
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
	} catch (err: unknown) {
		console.error('Error in daily digest endpoint:', err);
		throw error(500, 'Internal Server Error');
	}
};
