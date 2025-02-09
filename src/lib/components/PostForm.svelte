<script lang="ts">
	import { page } from '$app/state';
	import type { Keyword, Post } from '$lib/types';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';
	import MultiSelect from './ui/MultiSelect.svelte';
	import Select from './ui/Select.svelte';
	import Toggle from './ui/Toggle.svelte';

	let { editing, updated }: { editing?: Post; updated: () => void } = $props();

	let title = $state('');
	let description = $state('');
	let contact = $state('');
	let industry = $state(false);
	let education = $state<string | undefined>(undefined);
	let keywords = $state<number[]>([]);

	$effect(() => {
		title = editing?.title || '';
		description = editing?.description || '';
		contact = editing?.contact || '';
		industry = editing?.industry || false;
		education = editing?.education || undefined;
		keywords = editing?.keyword.map((keyword) => keyword.id) || [];
	});

	async function addPost() {
		await fetch('/api/post', {
			method: 'POST',
			body: JSON.stringify({ title, description, contact, industry, education, keywords })
		});
		title = '';
		description = '';
		contact = '';
		updated();
	}

	async function updatePost() {
		await fetch(`/api/post/${editing?.id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				title,
				description,
				contact,
				industry,
				education,
				keywords,
				vetted: false
			})
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
	<div class="flex items-center gap-2">
		<Select
			emptyText="Minimum Education Level"
			options={[
				{ value: 'none', label: 'None' },
				{ value: 'undergraduate', label: 'Undergraduate' },
				{ value: 'graduate', label: 'Graduate' },
				{ value: 'phd', label: 'PhD' }
			]}
			bind:value={education}
			allowEmpty
			class="shrink-0"
		/>
		<MultiSelect
			options={page.data.keywords.map((keyword: Keyword) => ({
				value: keyword.id,
				label: keyword.title
			}))}
			bind:values={keywords}
			class="w-1/2"
			showAll
			emptyText="Keywords"
		/>
		<Input
			name="contact"
			placeholder="Contact email or website"
			bind:value={contact}
			class="w-1/2"
		/>
	</div>
	<div class="flex justify-end gap-6">
		<Toggle label="Industry Position" bind:checked={industry} />
		<Button
			disabled={!title || !description || !contact || !education}
			onclick={() => {
				editing ? updatePost() : addPost();
			}}
		>
			{editing ? 'Update' : 'Create'}
		</Button>
	</div>
</div>
