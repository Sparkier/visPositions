<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let {
		value = $bindable(),
		options,
		allowEmpty = false,
		emptyText = '',
		class: classNames = '',
		onchange,
		disabled = false
	}: {
		value: unknown;
		options: { value: unknown; label: number | string }[];
		allowEmpty?: boolean;
		emptyText?: string;
		class?: string;
		onchange?: ChangeEventHandler<HTMLSelectElement>;
		disabled?: boolean;
	} = $props();
</script>

<div class={twMerge('relative', classNames)}>
	<select
		class="w-full cursor-pointer appearance-none rounded border border-gray-200 px-2 py-1.5 pe-8 outline-none transition ease-in-out focus:border-primary focus:ring-primary disabled:opacity-50"
		bind:value
		{onchange}
		{disabled}
	>
		{#if allowEmpty}
			<option value={undefined}>{emptyText}</option>
		{/if}
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
