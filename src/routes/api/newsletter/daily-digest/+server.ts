import {
	ADMIN_EMAIL,
	DAILY_DIGEST_SECRET_KEY,
	FROM_EMAIL,
	LINKEDIN_ORGANIZATION_ID,
	RESEND_API_KEY,
	RESEND_AUDIENCE_ID
} from '$env/static/private';
// Read dynamically so the heartbeat stays optional — an unset URL simply
// disables the ping rather than breaking the build.
import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { escapeHtml } from '$lib/utils';
import { getAccessToken, getReconnectUrl, getTokenStatus } from '$lib/server/linkedin';
import type { RequestHandler } from './$types';

const resend = new Resend(RESEND_API_KEY);

/**
 * This route makes up to six sequential API calls. Vercel's default of 10s is
 * not enough: a single `broadcasts.create` has been observed taking ~17s.
 */
export const config = {
	maxDuration: 60
};

/** Ceiling for any one outbound call, so no single hop can eat the budget. */
const OUTBOUND_TIMEOUT_MS = 15_000;

/**
 * Dead-man's-switch ping. The monitor alerts when a run stops checking in,
 * which is the only signal that also catches the cron never firing at all.
 * Never allowed to fail or hang the digest it is reporting on.
 */
async function pingHeartbeat(): Promise<void> {
	const url = env.DIGEST_HEARTBEAT_URL;
	if (!url) return;

	try {
		await fetch(url, { method: 'POST', signal: AbortSignal.timeout(5000) });
	} catch (err) {
		console.error('Could not ping the digest heartbeat:', err);
	}
}

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
	if (authHeader !== `Bearer ${DAILY_DIGEST_SECRET_KEY}`) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	// Breadcrumbs so a future slow run names its own culprit in the Vercel logs,
	// instead of leaving only an opaque FUNCTION_INVOCATION_TIMEOUT.
	const startedAt = Date.now();
	const mark = (step: string) => console.log(`[digest] ${step} at +${Date.now() - startedAt}ms`);

	// Fetch posts vetted in the last 24 hours
	const twentyFourHoursAgo = new Date();
	twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
	const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

	// The token read and the posts query touch different tables and neither
	// depends on the other, so there is nothing to gain from running them back
	// to back.
	const [tokenStatus, { data: posts, error: postsError }] = await Promise.all([
		getTokenStatus(),
		supabase
			.from('post')
			.select('id, title, description, created_at')
			.eq('vetted', true)
			.gte('vetted_at', twentyFourHoursAgoISO)
			.order('vetted_at', { ascending: false })
	]);
	mark('token status and posts read');

	// Warned before the no-new-posts return below, so quiet days still warn.
	if (tokenStatus.needsRenewal) {
		await sendTokenWarning(
			tokenStatus.expired
				? 'The LinkedIn access token has expired.'
				: `The LinkedIn access token expires in ${tokenStatus.daysUntilExpiry} days.`
		);
	}

	try {
		if (postsError) {
			console.error('Error fetching vetted posts:', postsError);
			throw error(500, 'Error fetching posts');
		}

		if (!posts || posts.length === 0) {
			console.log('No newly vetted posts found in the last 24 hours.');
			// A quiet day is still a healthy run — ping, or the monitor would
			// alert every time there is simply nothing to send.
			await pingHeartbeat();
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
			`To unsubscribe, <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">click here</a>.` +
			`</p>`;

		const broadcast = await resend.broadcasts.create({
			name: `Daily Digest ${new Date().toLocaleDateString()}`,
			from: FROM_EMAIL,
			subject: subject,
			text: textBody,
			html: htmlBody,
			audienceId: RESEND_AUDIENCE_ID
		});

		mark('broadcast created');

		if (broadcast.error || !broadcast.data) {
			console.error('Error creating daily digest broadcast:', broadcast.error);
			throw error(500, 'Error creating daily digest broadcast');
		}

		const sendResult = await resend.broadcasts.send(broadcast.data.id);
		mark('broadcast sent');

		if (sendResult.error) {
			// The draft survives in Resend and can be sent by hand from the
			// dashboard — see the runbook note in the README.
			console.error(
				`Error sending daily digest (draft ${broadcast.data.id} left in Resend):`,
				sendResult.error
			);
			throw error(500, 'Error sending daily digest');
		}

		// Post to LinkedIn
		const linkedinToken = getAccessToken(tokenStatus);
		if (linkedinToken && LINKEDIN_ORGANIZATION_ID) {
			try {
				const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
					method: 'POST',
					// Capped because this is the last step: without a ceiling a
					// hanging LinkedIn takes the whole run down with it.
					signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
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

		mark('done');
		// Deliberately after the email send and not gated on the LinkedIn result:
		// the digest reaching subscribers is what this monitor is watching for.
		await pingHeartbeat();

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
