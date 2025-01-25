<script lang="ts">
	import type { Post } from '$lib/types';
	import Button from './Button.svelte';
	import Input from './Input.svelte';

	let { editing, updated }: { editing?: Post; updated: () => void } = $props();

	let title = $state('');
	let description = $state('');
	let contact = $state('');

	$effect(() => {
		title = editing?.title || '';
		description = editing?.description || '';
		contact = editing?.contact || '';
	});

	async function addPost() {
		await fetch('/api/post', {
			method: 'POST',
			body: JSON.stringify({ title, description, contact })
		});
		title = '';
		description = '';
		contact = '';
		updated();
	}

	async function updatePost() {
		await fetch(`/api/post/${editing?.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ title, description, contact })
		});
		updated();
	}
</script>

<div class="flex flex-col gap-2">
	<Input name="title" placeholder="Title" bind:value={title} />
	<textarea
		bind:value={description}
		placeholder="Description"
		class="focus:ring-primary-yellow focus:border-primary-yellow placeholder:text-text-lightest shrink-0 grow resize-none rounded border border-gray-200 px-2 py-1 transition-all disabled:opacity-50"
	></textarea>
	<Input name="contact" placeholder="Contact email or website" bind:value={contact} />
	<div class="flex justify-end">
		<Button
			disabled={!title || !description || !contact}
			onclick={() => {
				editing ? updatePost() : addPost();
			}}
		>
			{editing ? 'Update' : 'Create'}
		</Button>
	</div>
</div>
