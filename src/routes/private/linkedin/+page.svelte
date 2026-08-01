<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const errorMessages: Record<string, string> = {
		state_mismatch: 'The authorization request could not be verified. Please try again.',
		missing_code: 'LinkedIn did not return an authorization code. Please try again.',
		exchange_failed: 'Exchanging the authorization code failed. Check the server logs.'
	};

	let connected = $derived(page.url.searchParams.get('connected') === '1');
	let errorParam = $derived(page.url.searchParams.get('error'));
	let errorMessage = $derived(errorParam ? (errorMessages[errorParam] ?? errorParam) : null);

	function formatDate(value: string | null): string {
		return value ? new Date(value).toLocaleString() : '—';
	}

	let statusLine = $derived.by(() => {
		if (!data.connected)
			return 'No token stored yet — still using the LINKEDIN_ACCESS_TOKEN env var.';
		if (data.expired)
			return 'The stored token has expired. The digest cannot post until you reconnect.';
		if (data.needsRenewal) return `Expires in ${data.daysUntilExpiry} days — time to reconnect.`;
		return `Valid for another ${data.daysUntilExpiry} days.`;
	});
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h1 class="border-b">LinkedIn Connection</h1>
		<p>
			The daily digest posts to the visPositions LinkedIn page with an access token that LinkedIn
			expires after 60 days. Reconnecting here stores a fresh one — no redeploy needed.
		</p>
	</div>

	{#if connected}
		<p class="rounded border border-green-600 bg-green-50 px-3 py-2 text-green-800">
			LinkedIn reconnected successfully.
		</p>
	{/if}

	{#if errorMessage}
		<p class="rounded border border-red-500 bg-red-50 px-3 py-2 text-red-700">{errorMessage}</p>
	{/if}

	<dl class="flex flex-col gap-2">
		<div class="flex gap-2">
			<dt class="w-40 font-semibold">Status</dt>
			<dd>{statusLine}</dd>
		</div>
		<div class="flex gap-2">
			<dt class="w-40 font-semibold">Expires at</dt>
			<dd>{formatDate(data.expiresAt)}</dd>
		</div>
		<div class="flex gap-2">
			<dt class="w-40 font-semibold">Last reconnected</dt>
			<dd>{formatDate(data.updatedAt)}</dd>
		</div>
	</dl>

	<a
		href="/api/linkedin/auth"
		data-sveltekit-reload
		class="bg-primary hover:bg-primary-light flex w-fit items-center gap-2 rounded border px-2 py-1.5 text-white transition-all hover:shadow-md"
	>
		Reconnect LinkedIn
	</a>
</div>
