<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	let {
		label,
		checked = $bindable(false),
		onchange,
		class: classNames
	}: {
		label?: string;
		checked?: boolean;
		onchange?: (checked: boolean) => void;
		class?: string;
	} = $props();
</script>

<button
	class={twMerge('flex cursor-pointer items-center gap-2', classNames)}
	onclick={() => {
		checked = !checked;
		onchange && onchange(checked);
	}}
>
	<input type="checkbox" bind:checked class="peer sr-only" />
	<div
		class="after:border-text-lightest peer relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rtl:peer-checked:after:-translate-x-full"
	></div>
	{#if label}
		<span class="font-sm text-sm {checked ? 'text-gray-900' : ''} transition-all">{label}</span>
	{/if}
</button>
