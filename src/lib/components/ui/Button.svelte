<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FocusEventHandler, MouseEventHandler } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let {
		children,
		onclick = () => {},
		disabled = false,
		class: classNames = '',
		onmouseenter,
		onmouseleave,
		onfocus,
		onblur,
		danger = false
	}: {
		children: Snippet;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		disabled?: boolean;
		class?: string;
		onmouseenter?: MouseEventHandler<HTMLButtonElement>;
		onmouseleave?: MouseEventHandler<HTMLButtonElement>;
		onfocus?: FocusEventHandler<HTMLButtonElement>;
		onblur?: FocusEventHandler<HTMLButtonElement>;
		danger?: boolean;
	} = $props();

	function getClassNames(): string {
		const base =
			'disabled:text-gray-500 flex items-center gap-2 rounded border px-2 transition-all hover:shadow-md disabled:bg-gray-100 disabled:hover:shadow-none py-1.5 bg-primary text-white hover:bg-primary-light';
		if (danger) return twMerge(base, 'bg-red-500 hover:bg-red-600');
		return base;
	}
</script>

<button
	class={twMerge(getClassNames(), classNames)}
	{disabled}
	{onclick}
	{onmouseenter}
	{onmouseleave}
	{onfocus}
	{onblur}
>
	{@render children()}
</button>
