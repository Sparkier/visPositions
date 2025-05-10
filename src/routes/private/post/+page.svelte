<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { default as PostView } from '$lib/components/Post.svelte';
	import PostForm from '$lib/components/PostForm.svelte';
	import type { Post } from '$lib/types';

	let editing: Post | undefined = undefined;

	async function approvePost(postId: number) {
		await fetch(`/api/post/${postId}/approve`, {
			method: 'PATCH'
		});
		invalidateAll();
	}
</script>

<div class="flex min-h-0 flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h1 class="border-b">{editing ? 'Edit Post' : 'Create Post'}</h1>
		<PostForm
			{editing}
			updated={() => {
				editing = undefined;
				invalidateAll();
			}}
		/>
	</div>
	<div class="flex min-h-0 flex-col gap-2">
		<h1 class="border-b">{page.data.isAdmin ? 'Post Management' : 'Your Posts'}</h1>
		<div class="flex flex-col gap-2 overflow-y-auto">
			{#if page.data.posts.length}
				{#each page.data.posts as post}
					<PostView
						{post}
						deletable
						showVetted
						editClick={() => (editing = post)}
						isAdmin={page.data.isAdmin}
						approveClick={() => approvePost(post.id)}
					/>
				{/each}
			{:else}
				<p>No posts found</p>
			{/if}
		</div>
	</div>
</div>
