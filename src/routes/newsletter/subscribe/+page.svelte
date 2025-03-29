<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let email = $state('');
	let message = $state('');
	let messageType: 'success' | 'error' | '' = $state('');
	let loading = $state(false);

	async function handleSubmit() {
		loading = true;
		message = '';
		messageType = '';

		try {
			const response = await fetch('/api/newsletter/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const result = await response.json();

			if (response.ok && result.success) {
				message = result.message || 'Successfully subscribed!';
				messageType = 'success';
				email = ''; // Clear input on success
			} else {
				message = result.message || 'Subscription failed.';
				messageType = 'error';
			}
		} catch (error) {
			console.error('Subscription form error:', error);
			message = 'An unexpected error occurred.';
			messageType = 'error';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto max-w-xl p-4">
	<h1>Subscribe to Newsletter</h1>
	<p>Enter your email below to receive notifications about newly posted positions.</p>
	<div class="flex flex-col gap-2">
		<div class="flex space-x-2">
			<Input bind:value={email} placeholder="your.email@example.com" type="email" />
			<Button disabled={loading} onclick={handleSubmit}>
				{loading ? 'Subscribing...' : 'Subscribe'}
			</Button>
		</div>
		{#if message}
			<p
				class:text-green-600={messageType === 'success'}
				class:text-red-600={messageType === 'error'}
				class="mt-1 text-sm"
			>
				{message}
			</p>
		{/if}
	</div>
</div>
