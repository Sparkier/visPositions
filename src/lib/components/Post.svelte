<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Education, educationMap, type Post } from '$lib/types';
	import {
		BookOpen,
		Check,
		CircleOff,
		ExternalLink,
		Factory,
		GraduationCap,
		Pencil,
		PencilLine,
		School,
		Trash
	} from 'lucide-svelte';
	import Button from './ui/Button.svelte';

	let {
		post,
		deletable = false,
		showVetted = false,
		editClick = () => {},
		isAdmin = false,
		approveClick = () => {}
	}: {
		post: Post;
		deletable?: boolean;
		showVetted?: boolean;
		editClick?: () => void;
		isAdmin?: boolean;
		approveClick?: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-2 rounded-md border bg-white p-4 shadow-sm">
	<div class="flex flex-col justify-between md:flex-row md:items-center">
		<h1>{post.title}</h1>
		<div class="flex items-center gap-4">
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
					{#if isAdmin && !post.vetted}
						<Button
							onclick={() => {
								approveClick();
							}}
							class="bg-green-500 hover:bg-green-600"
						>
							<Check class="h-4 w-4" />
						</Button>
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
	</div>
	<p class="text-justify">{post.description}</p>
	<div class="flex flex-col justify-between gap-2 md:flex-row md:flex-wrap md:items-center">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-1 text-gray-500">
				{#if post.industry}
					<Factory class="h-4 w-4" />
				{:else}
					<School class="h-4 w-4" />
				{/if}
				<span class="text-sm text-gray-500">
					{post.industry ? 'Industry Position' : 'Academic Position'}
				</span>
			</div>
			<div class="flex items-center gap-1 text-gray-500">
				{#if post.education === Education.None}
					<CircleOff class="h-4 w-4" />
				{:else if post.education === Education.Undergraduate}
					<PencilLine class="h-4 w-4" />
				{:else if post.education === Education.Graduate}
					<BookOpen class="h-4 w-4" />
				{:else if post.education === Education.PhD}
					<GraduationCap class="h-4 w-4" />
				{/if}
				<span class="text-sm text-gray-500">{educationMap[post.education]}</span>
			</div>
		</div>
		<div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-4">
			<div class="flex items-center gap-4 text-xs text-gray-500">
				<p>Posted: {new Date(post.created_at).toLocaleDateString()}</p>
				<p>
					{new Date(post.expiration_date) < new Date() ? 'Expired:' : 'Expires:'}
					{new Date(post.expiration_date).toLocaleDateString()}
				</p>
			</div>
			{#if post.keyword.length > 0}
				<div class="flex flex-wrap items-center gap-1">
					{#each post.keyword as keyword}
						<span class="rounded-md border-2 border-accent/50 bg-gray-50 px-1 text-xs text-gray-500"
							>{keyword.title}</span
						>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
