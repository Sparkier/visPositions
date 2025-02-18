<script lang="ts">
	import { type Snippet } from 'svelte';
	import type { KeyboardEventHandler, MouseEventHandler } from 'svelte/elements';
	import { fade } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';

	let {
		children,
		onclose,
		onkeydown,
		class: classNames = ''
	}: {
		children: Snippet;
		onclose: MouseEventHandler<HTMLDivElement>;
		onkeydown?: KeyboardEventHandler<Window>;
		class?: string;
	} = $props();
</script>

<svelte:window {onkeydown} />

<div
	class="fixed inset-0 z-40 flex cursor-default items-baseline justify-center bg-gray-200 bg-opacity-80 p-12 text-left"
	transition:fade={{ duration: 200 }}
	onmousedown={onclose}
	onkeydown={() => undefined}
	role="button"
	tabindex="0"
>
	<button
		class={twMerge(
			'flex max-h-[90%] min-h-0 cursor-default flex-col rounded border bg-white p-4',
			classNames
		)}
		onmousedown={(e) => e.stopPropagation()}
		onclick={(e) => e.stopPropagation()}
	>
		{@render children()}
	</button>
</div>
