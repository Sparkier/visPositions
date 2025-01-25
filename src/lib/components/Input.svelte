<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	let {
		type = 'text',
		class: classNames,
		value = $bindable(),
		name,
		id,
		placeholder,
		element = $bindable(),
		oninput,
		onfocus,
		onblur,
		onkeydown,
		onchange
	}: {
		type?: string;
		class?: string;
		value?: unknown;
		placeholder?: string;
		element?: HTMLInputElement;
		name?: string;
		id?: string;
		oninput?: (event: Event) => void;
		onfocus?: (event: Event) => void;
		onblur?: (event: Event) => void;
		onkeydown?: (event: KeyboardEvent) => void;
		onchange?: (event: Event) => void;
	} = $props();
</script>

<input
	{type}
	class={twMerge(
		'focus:ring-primary-yellow focus:border-primary-yellow placeholder:text-text-lightest rounded border border-gray-200 bg-white px-2 py-1.5 transition-all',
		classNames
	)}
	{placeholder}
	{name}
	{id}
	bind:value
	bind:this={element}
	{oninput}
	{onfocus}
	{onblur}
	{onkeydown}
	{onchange}
	autocomplete="off"
/>
