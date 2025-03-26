<script lang="ts">
        import { invalidateAll } from '$app/navigation';
        import { Education, educationMap, type Post } from '$lib/types';
        import {
                BookOpen,
                CircleOff,
                ExternalLink,
                Factory,
                GraduationCap,
                Pencil,
                PencilLine,
                School,
                Trash
        } from 'lucide-svelte';
        import Button from './ui/Button.svelte';

        let {
                post,
                deletable = false,
                showVetted = false,
                editClick = () => {}
        }: { post: Post; deletable?: boolean; showVetted?: boolean; editClick?: () => void } = $props();
</script>

<div class="flex flex-col gap-2 rounded-md border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
                <h1>{post.title}</h1>
                {#if !deletable}
                        {#if post.contact.startsWith('http')}
                                <Button onclick={() => window.open(post.contact, '_blank', 'noopener,noreferrer')}>
                                        Apply
                                        <ExternalLink class="h-4 w-4" />
                                </Button>
                        {:else}
                                <Button onclick={() => (window.location.href = `mailto:${post.contact}`)}>Apply</Button>
                        {/if}
                {:else}
                        <div class="flex items-center gap-2">
                                {#if showVetted && !post.vetted}
                                        <span class="text-sm text-gray-500">
                                                This post will be public once it has been vetted.
                                        </span>
                                {/if}
                                <Button
                                        onclick={() => {
                                                editClick();
                                        }}
                                >
                                        <Pencil class="h-4 w-4" />
                                </Button>
                                <Button
                                        danger
                                        onclick={() => {
                                                fetch(`/api/post/${post.id}`, {
                                                        method: 'DELETE'
                                                });
                                                invalidateAll();
                                        }}
                                >
                                        <Trash class="h-4 w-4" />
                                </Button>
                        </div>
                {/if}
        </div>
        <div class="flex flex-wrap gap-4">
            <p>Posted on {new Date(post.created_at).toLocaleDateString()}</p>
            {@const expirationDate = new Date(post.expiration_date)}
            {@const now = new Date()}
            {@const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)}
            {@const isExpiringSoon = expirationDate <= twoWeeksFromNow && expirationDate > now}
            {@const isExpired = expirationDate <= now}
            
            {#if isExpired}
                <p class="font-medium text-red-600">Expired on {expirationDate.toLocaleDateString()}</p>
            {:else if isExpiringSoon}
                <p class="font-medium text-amber-600">Expires soon: {expirationDate.toLocaleDateString()}</p>
            {:else}
                <p>Expires on {expirationDate.toLocaleDateString()}</p>
            {/if}
        </div>
        <p class="text-justify">{post.description}</p>
        <div class="flex items-center gap-6">
                <div class="flex items-center gap-1 text-gray-500">
                        {#if post.industry}
                                <Factory class="h-4 w-4" />
                        {:else}
                                <School class="h-4 w-4" />
                        {/if}
                        <span class="text-sm text-gray-500">
                                {post.industry ? 'Industry Position' : 'Academic Position'}
                        </span>
                </div>
                <div class="flex items-center gap-1 text-gray-500">
                        {#if post.education === Education.None}
                                <CircleOff class="h-4 w-4" />
                        {:else if post.education === Education.Undergraduate}
                                <PencilLine class="h-4 w-4" />
                        {:else if post.education === Education.Graduate}
                                <BookOpen class="h-4 w-4" />
                        {:else if post.education === Education.PhD}
                                <GraduationCap class="h-4 w-4" />
                        {/if}
                        <span class="text-sm text-gray-500">{educationMap[post.education]}</span>
                </div>
                <div class="ml-auto flex items-center gap-1">
                        {#each post.keyword as keyword}
                                <span class="rounded-md bg-gray-100 px-1 text-sm text-gray-500">{keyword.title}</span>
                        {/each}
                </div>
        </div>
</div>
