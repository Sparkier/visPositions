<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let { form } = $props();
</script>

<div class="flex flex-col items-center gap-4 p-4">
	{#if form?.success}
		<div class="p-4 text-center">
			<h2 class="mb-2 text-lg font-semibold">Signup Successful!</h2>
			<p>{form?.message || 'Please check your email to confirm your account.'}</p>
			<p class="mt-2 text-sm">You can close this page.</p>
		</div>
	{:else}
		<h1 class="mb-4 text-2xl font-bold">Create Account</h1>
		<form
			method="POST"
			action="?/signup"
			class="flex w-full max-w-xs flex-col items-center gap-2"
			use:enhance
		>
			<Input name="email" type="email" placeholder="Email" />
			<Input name="password" type="password" placeholder="Password" />
			<Input name="confirmPassword" type="password" placeholder="Confirm Password" />
			{#if form?.incorrect && form?.message}
				<p class="text-sm text-red-500">{form.message}</p>
			{/if}
			<Button>Sign up</Button>
		</form>
		<p class="mt-4 text-sm">
			Already have an account? <a href="/auth" class="text-primary hover:underline">Login</a>
		</p>
	{/if}
</div>
