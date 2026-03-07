import { WEBHOOK_SECRET } from '$env/static/private';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

// Initialize a Supabase client with the Anon key.
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

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
				console.warn('Skipping row missing required fields:', row);
				continue;
			}

			// 1. Deduplication check via title + contact
			// While not perfect, checking if a post with the exact title and contact
			// already exists is a reasonable way to prevent duplicates when users sync multiple times.
			const { data: existingPost } = await supabaseAdmin
				.from('post')
				.select('id')
				.eq('title', title)
				.eq('contact', contact)
				.maybeSingle();

			if (existingPost) {
				skippedCount++;
				continue;
			}

			// 2. Prepare Expiration Date
			const finalExpirationDate =
				expiration_date ||
				(() => {
					const defaultDate = new Date();
					defaultDate.setMonth(defaultDate.getMonth() + 3);
					return defaultDate.toISOString();
				})();

			// 3. Insert Post
			const { data: postData, error: postError } = await supabaseAdmin
				.from('post')
				.insert({
					title,
					description,
					contact,
					industry: industry === 'Industry' || industry === true,
					education: education?.toLowerCase() || 'none',
					creator: 'Google Sheets Webhook',
					created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
					expiration_date: new Date(finalExpirationDate).toISOString()
				})
				.select()
				.single();

			if (postError) {
				console.error('Failed to create post:', postError);
				continue; // Skip keywords if post fails
			}

			insertedCount++;

			// 4. Associate Keywords
			if (keywords && Array.isArray(keywords) && keywords.length > 0) {
				// We need to map the string keywords from the sheet (e.g. "AI, Visualization")
				// to the actual keyword IDs in the database.
				// First, try to find the existing keywords:
				const { data: existingKeywords } = await supabaseAdmin
					.from('keyword')
					.select('id, title')
					.in('title', keywords);

				const keywordIdsToInsert = [];

				for (const kw of keywords) {
					const found = existingKeywords?.find((ek) => ek.title.toLowerCase() === kw.toLowerCase());
					if (found) {
						keywordIdsToInsert.push(found.id);
					} else {
						// Optionally create missing keywords, or just ignore them.
						// We'll create them.
						const { data: newKw, error: kwError } = await supabaseAdmin
							.from('keyword')
							.insert({ title: kw })
							.select()
							.single();

						if (!kwError && newKw) {
							keywordIdsToInsert.push(newKw.id);
						}
					}
				}

				if (keywordIdsToInsert.length > 0) {
					await supabaseAdmin.from('postkeyword').insert(
						keywordIdsToInsert.map((keywordId) => ({
							post_id: postData.id,
							keyword_id: keywordId
						}))
					);
				}
			}
		}

		return new Response(JSON.stringify({ success: true, insertedCount, skippedCount }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Webhook error:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
