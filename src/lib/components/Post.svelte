<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Post } from '$lib/types';
	import { ExternalLink, Pencil, Trash } from 'lucide-svelte';
	import Button from './Button.svelte';

	let {
		post,
		deletable = false,
		showVetted = false,
		editClick = () => {}
	}: { post: Post; deletable?: boolean; showVetted?: boolean; editClick?: () => void } = $props();
</script>

<div class="flex flex-col gap-2 rounded-md border bg-white p-4 shadow-sm">
	<div class="flex items-center justify-between">
		<h1>{post.title}</h1>
		{#if !deletable}
			{#if post.contact.startsWith('http')}
				<Button onclick={() => window.open(post.contact, '_blank', 'noopener,noreferrer')}>
					Apply
					<ExternalLink class="h-4 w-4" />
				</Button>
			{:else}
				<Button onclick={() => (window.location.href = `mailto:${post.contact}`)}>Apply</Button>
			{/if}
		{:else}
			<div class="flex items-center gap-2">
				{#if showVetted && !post.vetted}
					<span class="text-sm text-gray-500">
						This post will be public once it has been vetted.
					</span>
				{/if}
				<Button
					onclick={() => {
						editClick();
					}}
				>
					<Pencil class="h-4 w-4" />
				</Button>
				<Button
					danger
					onclick={() => {
						fetch(`/api/post/${post.id}`, {
							method: 'DELETE'
						});
						invalidateAll();
					}}
				>
					<Trash class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>
	<p>Posted on {new Date(post.created_at).toLocaleDateString()}</p>
	<p class="text-justify">{post.description}</p>
</div>
