<script lang="ts">
	import { X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import Button from './Button.svelte';
	import Checkbox from './Checkbox.svelte';

	let {
		options,
		values = $bindable(),
		showAll = false,
		onchange,
		class: classNames = '',
		emptyText = '-'
	} = $props<{
		options: { label: string; value: string | number; description?: string }[];
		values: string[] | number[];
		showAll?: boolean;
		onchange?: (value: string | number) => void;
		class?: string;
		emptyText?: string;
	}>();

	let detailsOpen = $state(false);

	function updateValue(optionValue: string) {
		if (values.includes(optionValue)) {
			values = values.filter((v: string) => v !== optionValue);
		} else {
			values = [...values, optionValue];
		}
		onchange?.(optionValue);
	}

	function handleClickOutside(event: MouseEvent) {
		if (!(event.target as Element).closest('details')) {
			detailsOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleClickOutside);
		return () => {
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<details
	bind:open={detailsOpen}
	class={twMerge('relative inline-flex flex-col rounded border bg-white', classNames)}
>
	<summary
		class="relative cursor-pointer list-none px-2 py-1.5 marker:content-none"
		style="-webkit-details-marker: none;"
	>
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				{#if values.length === 0}
					{emptyText}
				{:else if showAll || values.length === 1}
					{#each values as value}
						<div class="flex items-center gap-1 rounded bg-gray-100 pl-1">
							{options.find(
								(option: { label: string; value: string | number }) => option.value === value
							)?.label}
							<Button onclick={() => updateValue(value)} class="p-1">
								<X class="h-3 w-3" />
							</Button>
						</div>
					{/each}
				{:else}
					{values.length} selected
				{/if}
			</div>
			<svg
				class="rotate-0 transform transition-all duration-300"
				fill="none"
				height="20"
				width="16"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		</div>
	</summary>
	<form class="absolute z-20 flex w-auto min-w-full bg-white">
		<fieldset class="w-full border-0 bg-white p-0">
			<ul class="list-none border">
				{#each options as option}
					<li class="my-1 rounded px-2 py-0.5 hover:bg-gray-100">
						<label
							for="checked-checkbox-{option.value}"
							class="flex items-center justify-between gap-4 whitespace-nowrap"
						>
							<div class="flex flex-col">
								<span>{option.label}</span>
								{#if option.description}
									<span class="text-sm text-gray-500">{option.description}</span>
								{/if}
							</div>
							<Checkbox
								id={option.value}
								checked={values.includes(option.value)}
								onchange={() => updateValue(option.value)}
							/>
						</label>
					</li>
				{/each}
			</ul>
		</fieldset>
	</form>
</details>

<style>
	details summary::-webkit-details-marker {
		display: none;
	}
</style>
