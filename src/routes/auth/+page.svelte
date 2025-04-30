<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
</script>

<div class="flex flex-col items-center gap-2">
	<form method="POST" action="?/login" class="flex flex-col items-center gap-2">
		<Input name="email" type="email" placeholder="Email" />
		<Input name="password" type="password" placeholder="Password" />
		<Button>Login</Button>
	</form>
	<p class="mt-4">
		Don't have an account? <a href="/auth/signup" class="text-primary hover:underline">Sign up</a>
	</p>
</div>
