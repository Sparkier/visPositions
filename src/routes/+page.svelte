<script lang="ts">
	import { page } from '$app/state';
	import Post from '$lib/components/Post.svelte';
</script>

{#each page.data.posts as post}
	<Post {post} />
{/each}
