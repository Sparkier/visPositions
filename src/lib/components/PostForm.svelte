<script lang="ts">
        import { page } from '$app/state';
        import type { Keyword, Post } from '$lib/types';
        import Button from './ui/Button.svelte';
        import Input from './ui/Input.svelte';
        import MultiSelect from './ui/MultiSelect.svelte';
        import Select from './ui/Select.svelte';
        import Toggle from './ui/Toggle.svelte';

        let { editing, updated }: { editing?: Post; updated: () => void } = $props();

        let title = $state('');
        let description = $state('');
        let contact = $state('');
        let industry = $state(false);
        let education = $state<string | undefined>(undefined);
        let keywords = $state<number[]>([]);
        let expiration_date = $state('');

        $effect(() => {
                title = editing?.title || '';
                description = editing?.description || '';
                contact = editing?.contact || '';
                industry = editing?.industry || false;
                education = editing?.education || undefined;
                keywords = editing?.keyword.map((keyword) => keyword.id) || [];
                
                // Format the expiration date for the date input if it exists
                if (editing?.expiration_date) {
                    // Convert ISO string to YYYY-MM-DD format for date input
                    expiration_date = new Date(editing.expiration_date).toISOString().split('T')[0];
                } else {
                    // Default to 3 months from now for new posts
                    const defaultDate = new Date();
                    defaultDate.setMonth(defaultDate.getMonth() + 3);
                    expiration_date = defaultDate.toISOString().split('T')[0];
                }
        });

        async function addPost() {
                await fetch('/api/post', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            title, 
                            description, 
                            contact, 
                            industry, 
                            education, 
                            keywords,
                            expiration_date: new Date(expiration_date).toISOString()
                        })
                });
                title = '';
                description = '';
                contact = '';
                updated();
        }

        async function updatePost() {
                await fetch(`/api/post/${editing?.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                                title,
                                description,
                                contact,
                                industry,
                                education,
                                keywords,
                                vetted: false,
                                expiration_date: new Date(expiration_date).toISOString()
                        })
                });
                updated();
        }
</script>

<div class="flex flex-col gap-2">
        <Input name="title" placeholder="Title" bind:value={title} />
        <textarea
                bind:value={description}
                placeholder="Description"
                class="focus:ring-primary-yellow focus:border-primary-yellow placeholder:text-text-lightest shrink-0 grow resize-none rounded border border-gray-200 px-2 py-1 transition-all disabled:opacity-50"
        ></textarea>
        <div class="flex items-center gap-2">
                <Select
                        emptyText="Minimum Education Level"
                        options={[
                                { value: 'none', label: 'None' },
                                { value: 'undergraduate', label: 'Undergraduate' },
                                { value: 'graduate', label: 'Graduate' },
                                { value: 'phd', label: 'PhD' }
                        ]}
                        bind:value={education}
                        allowEmpty
                        class="shrink-0"
                />
                <MultiSelect
                        options={page.data.keywords.map((keyword: Keyword) => ({
                                value: keyword.id,
                                label: keyword.title
                        }))}
                        bind:values={keywords}
                        class="w-1/2"
                        showAll
                        emptyText="Keywords"
                />
                <Input
                        name="contact"
                        placeholder="Contact email or website"
                        bind:value={contact}
                        class="w-1/2"
                />
        </div>
        <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                        <label for="expiration_date" class="text-sm text-gray-600">Expires on:</label>
                        <input 
                                type="date" 
                                id="expiration_date" 
                                bind:value={expiration_date}
                                required
                                class="focus:ring-primary-yellow focus:border-primary-yellow placeholder:text-text-lightest shrink-0 rounded border border-gray-200 px-2 py-1 transition-all disabled:opacity-50"
                        />
                </div>
                <Toggle label="Industry Position" bind:checked={industry} class="ml-auto" />
        </div>
        <div class="flex justify-end gap-6">
                <Button
                        disabled={!title || !description || !contact || !education || !expiration_date}
                        onclick={() => {
                                editing ? updatePost() : addPost();
                        }}
                >
                        {editing ? 'Update' : 'Create'}
                </Button>
        </div>
</div>
