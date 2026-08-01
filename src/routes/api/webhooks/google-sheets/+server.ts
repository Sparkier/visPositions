import { json } from '@sveltejs/kit';
import { WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { getDefaultExpirationDate } from '$lib/utils';

// Use the service role key to bypass RLS policies.
// The anon key is subject to RLS and will silently block inserts
// from unauthenticated contexts like this webhook.
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const payload = await request.json();

		if (!Array.isArray(payload)) {
			return new Response('Invalid payload format. Expected an array of rows.', { status: 400 });
		}

		let insertedCount = 0;
		let skippedCount = 0;
		const errors: { title: string; error: string }[] = [];

		// Pre-fetch all potentially matching posts to eliminate N+1 queries
		const titles = Array.from(
			new Set(
				payload.map((r: { title?: string }) => r.title).filter((t): t is string => Boolean(t))
			)
		);
		const contacts = Array.from(
			new Set(
				payload.map((r: { contact?: string }) => r.contact).filter((c): c is string => Boolean(c))
			)
		);

		const existingPostsSet = new Set<string>();

		if (titles.length > 0 && contacts.length > 0) {
			const { data: existingPosts } = await supabaseAdmin
				.from('post')
				.select('title, contact')
				.in('title', titles)
				.in('contact', contacts);

			if (existingPosts) {
				for (const post of existingPosts) {
					existingPostsSet.add(`${post.title}:::${post.contact}`);
				}
			}
		}

		const postsToInsert = [];
		const postKeywordsMap = new Map<string, string[]>();

		for (const row of payload) {
			const {
				title,
				description,
				contact,
				industry,
				education,
				keywords,
				created_at,
				expiration_date
			} = row;

			// Validate essential fields to prevent bad inserts
			if (!title || !description || !contact) {
				errors.push({
					title: title || '(no title)',
					error: 'Missing required fields (title, description, or contact)'
				});
				continue;
			}

			const uniqueKey = `${title}:::${contact}`;

			// 1. O(1) Deduplication check via Set
			if (existingPostsSet.has(uniqueKey)) {
				skippedCount++;
				continue;
			}

			// 2. Prepare Expiration Date
			const finalExpirationDate = expiration_date || getDefaultExpirationDate().toISOString();

			// 3. Queue Post for Insertion
			postsToInsert.push({
				title,
				description,
				contact,
				industry: industry === 'Industry' || industry === true,
				education: education?.toLowerCase() || 'none',
				creator: 'Google Sheets Webhook',
				created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
				expiration_date: new Date(finalExpirationDate).toISOString()
			});

			existingPostsSet.add(uniqueKey);

			if (keywords && Array.isArray(keywords) && keywords.length > 0) {
				postKeywordsMap.set(uniqueKey, keywords);
			}
		}

		if (postsToInsert.length > 0) {
			const { data: insertedPosts, error: postError } = await supabaseAdmin
				.from('post')
				.insert(postsToInsert)
				.select();

			if (postError) {
				console.error('Failed to bulk insert posts:', postError);
				// If bulk insert fails, we can't easily map errors to individual posts,
				// so we report a general error.
				return json(
					{ error: 'Internal Server Error', details: `Bulk insert failed: ${postError.message}` },
					{ status: 500 }
				);
			}

			if (insertedPosts) {
				insertedCount = insertedPosts.length;

				// 4. Associate Keywords (Bulk processing)
				if (postKeywordsMap.size > 0) {
					// Gather all unique keywords across all posts
					const allKeywords = new Set<string>();
					for (const kws of postKeywordsMap.values()) {
						kws.forEach((kw) => allKeywords.add(kw));
					}

					const allKeywordsArray = Array.from(allKeywords);

					if (allKeywordsArray.length > 0) {
						const { data: existingKeywords } = await supabaseAdmin
							.from('keyword')
							.select('id, title')
							.in('title', allKeywordsArray);

						const existingKeywordMap = new Map<string, number>();
						if (existingKeywords) {
							existingKeywords.forEach((ek) => {
								existingKeywordMap.set(ek.title.toLowerCase(), ek.id);
							});
						}

						const newKeywordsToInsert: { title: string }[] = [];
						const keywordTitleToIdMap = new Map<string, number>();

						for (const kw of allKeywordsArray) {
							const kwLower = kw.toLowerCase();
							if (existingKeywordMap.has(kwLower)) {
								keywordTitleToIdMap.set(kwLower, existingKeywordMap.get(kwLower)!);
							} else {
								newKeywordsToInsert.push({ title: kw });
							}
						}

						if (newKeywordsToInsert.length > 0) {
							const { data: newKws, error: kwError } = await supabaseAdmin
								.from('keyword')
								.insert(newKeywordsToInsert)
								.select();

							if (!kwError && newKws) {
								newKws.forEach((kw) => {
									keywordTitleToIdMap.set(kw.title.toLowerCase(), kw.id);
								});
							} else if (kwError) {
								console.error('Failed to bulk insert keywords:', kwError);
							}
						}

						const postKeywordsToInsert = [];
						for (const post of insertedPosts) {
							const uniqueKey = `${post.title}:::${post.contact}`;
							const keywordsForPost = postKeywordsMap.get(uniqueKey);
							if (keywordsForPost) {
								for (const kw of keywordsForPost) {
									const kwId = keywordTitleToIdMap.get(kw.toLowerCase());
									if (kwId) {
										postKeywordsToInsert.push({
											post_id: post.id,
											keyword_id: kwId
										});
									}
								}
							}
						}

						if (postKeywordsToInsert.length > 0) {
							await supabaseAdmin.from('postkeyword').insert(postKeywordsToInsert);
						}
					}
				}
			}
		}

		return json({ success: true, insertedCount, skippedCount, errors });
	} catch (error) {
		console.error('Webhook error:', error);
		return json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
	}
};
