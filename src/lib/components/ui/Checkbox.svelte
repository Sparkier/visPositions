<script lang="ts">
	import type { ChangeEventHandler, MouseEventHandler } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let {
		checked = $bindable(false),
		label,
		onchange,
		class: classNames,
		onclick,
		id
	}: {
		checked: boolean;
		label?: string;
		onchange?: ChangeEventHandler<HTMLInputElement>;
		class?: string;
		onclick?: MouseEventHandler<HTMLInputElement>;
		id?: string;
	} = $props();
</script>

<div class="flex items-center">
	<input
		bind:checked
		{onchange}
		{onclick}
		id="checked-checkbox-{id ? id : label}"
		type="checkbox"
		value=""
		class={twMerge(
			'h-4 w-4 rounded text-primary transition-all focus:ring-2 focus:ring-primary',
			classNames
		)}
	/>
	{#if label}
		<label for="checked-checkbox-{label}" class="text-text-light ms-2 text-sm">{label}</label>
	{/if}
</div>
