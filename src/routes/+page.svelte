<script lang="ts">
	import { page } from '$app/state';
	import Post from '$lib/components/Post.svelte';
	import PostFilters from '$lib/components/PostFilters.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import type { Post as PostType } from '$lib/types';
	import Device from 'svelte-device-info';

	let search = $state('');
	let keywords = $state<string[]>([]);
	let education = $state<string[]>([]);
	let industry = $state<boolean | undefined>(undefined);

	const filteredPosts = $derived(
		page.data.posts.filter(
			(post: PostType) =>
				(post.title.toLowerCase().includes(search.toLowerCase()) ||
					post.description.toLowerCase().includes(search.toLowerCase())) &&
				(keywords.length === 0 ||
					keywords.every((keyword) => post.keyword.some((k) => k.title === keyword))) &&
				(education.length === 0 || education.includes(post.education)) &&
				(industry === undefined || industry === post.industry)
		)
	);
</script>

<div class="flex h-full min-h-0 flex-col gap-2">
	<Input name="search" placeholder="Search" bind:value={search} />
	<div class="flex min-h-0 grow gap-2">
		{#if !Device.isMobile}
			<div class="flex w-[300px] shrink-0 flex-col gap-2">
				<PostFilters
					bind:keywords
					bind:education
					bind:industry
					posts={page.data.posts}
					{filteredPosts}
				/>
			</div>
		{/if}
		<div class="flex flex-col gap-2 overflow-y-auto">
			{#each filteredPosts as post}
				<Post {post} />
			{/each}
		</div>
	</div>
</div>
