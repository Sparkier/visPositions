<script lang="ts">
	import Post from '$lib/components/Post.svelte';
	import type { Post as PostType } from '$lib/types';

	let { data } = $props();

	const post: PostType = $derived(data.post);

	const siteUrl = 'https://vispositions.com';
	const title = $derived(`${post.title} — visPositions`);
	const description = $derived((post.description ?? '').slice(0, 160));
	const url = $derived(`${siteUrl}/jobs/${post.id}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-y-auto">
	<a href="/" class="text-sm text-gray-500 transition-all hover:text-primary">← All positions</a>
	<Post {post} />
</div>
