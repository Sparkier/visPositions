<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { HelpCircle, Plus } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import '../app.css';

	let { data, children } = $props();
	let { session, supabase } = $derived(data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});
</script>

<div class="flex h-full flex-col">
	<header class="flex items-center justify-between bg-primary p-4 text-white">
		<button
			class="flex items-center gap-2"
			onclick={() => {
				goto('/');
			}}
		>
			<h1>visPositions</h1>
		</button>
		<nav class="flex items-center gap-2">
			<a href="/private/post" class="transition-colors hover:text-accent"><Plus /></a>
			<button class="transition-colors hover:text-accent"><HelpCircle /></button>
		</nav>
	</header>
	<main class="flex min-h-0 grow flex-col gap-2 bg-slate-50 p-2">
		{@render children()}
	</main>
</div>
