<script lang="ts">
	import type { Post } from '$lib/types';
	import vegaTheme, { markColor } from '$lib/vegaTheme';
	import { VegaLite, type VisualizationSpec } from 'svelte-vega';
	import { onMount } from 'svelte';

	let {
		keywords = $bindable([]),
		education = $bindable([]),
		industry = $bindable(undefined),
		posts,
		filteredPosts
	}: {
		keywords: string[];
		education: string[];
		industry: boolean | undefined;
		posts: Post[];
		filteredPosts: Post[];
	} = $props();

	const keywordData = $derived({
		table: [
			...posts.flatMap((post) =>
				post.keyword.map((keyword) => {
					return { title: keyword.title, filtered: false };
				})
			),
			...filteredPosts.flatMap((post) =>
				post.keyword.map((keyword) => {
					return { title: keyword.title, filtered: true };
				})
			)
		]
	});

	const educationData = $derived({
		table: [
			...posts.map((post) => {
				return { title: post.education, filtered: false };
			}),
			...filteredPosts.map((post) => {
				return { title: post.education, filtered: true };
			})
		]
	});

	const industryData = $derived({
		table: [
			...posts.map((post) => {
				return { title: post.industry ? 'industry' : 'academia', filtered: false };
			}),
			...filteredPosts.map((post) => {
				return { title: post.industry ? 'industry' : 'academia', filtered: true };
			})
		]
	});

	function getSpec(title: string, minExtent: number, labelLimit?: number): VisualizationSpec {
		return {
			$schema: 'https://vega.github.io/schema/vega-lite/v5.json',
			title: title,
			data: {
				name: 'table'
			},
			params: [
				{
					name: 'selected',
					select: { type: 'point', fields: ['title'] }
				}
			],
			width: 'container',
			mark: { type: 'bar', cursor: 'pointer' },
			encoding: {
				y: {
					field: 'title',
					type: 'nominal',
					axis: {
						title: null,
						minExtent: minExtent,
						...(labelLimit !== undefined ? { labelLimit } : {})
					}
				},
				x: {
					aggregate: 'count',
					type: 'quantitative',
					stack: null,
					axis: { title: null }
				},
				color: {
					field: 'filtered',
					type: 'nominal',
					scale: {
						domain: [false, true],
						range: ['#ccc', markColor]
					},
					legend: null
				}
			}
		};
	}

	const vegaOptions = {
		config: vegaTheme,
		actions: false
	};

	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	function onselect(args: [string, unknown], type: string) {
		if (args[1] && typeof args[1] === 'object' && 'title' in args[1]) {
			const elements = (args[1] as { title: string[] }).title;
			if (type === 'keyword') {
				keywords = elements;
			} else if (type === 'education') {
				education = elements;
			} else if (type === 'industry') {
				industry = elements[0] === 'industry';
			}
		} else {
			if (type === 'keyword') {
				keywords = [];
			} else if (type === 'education') {
				education = [];
			} else if (type === 'industry') {
				industry = undefined;
			}
		}
	}
</script>

<div class="flex w-full flex-col gap-4">
	{#if isMounted}
		<VegaLite
			spec={getSpec('Job Type', 100, 90)}
			data={industryData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'industry');
				}
			}}
		/>
	{:else}
		<!-- Skeleton/Placeholder shell for Job Type -->
		<div
			class="flex h-[150px] w-full flex-col gap-3 rounded border border-gray-200 bg-white p-3 animate-pulse justify-center"
		>
			<div class="h-4 w-20 bg-gray-200 rounded"></div>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-200 rounded-sm" style="width: 60%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 40%"></div>
				</div>
			</div>
		</div>
	{/if}

	{#if isMounted}
		<VegaLite
			spec={getSpec('Minimum Education', 100, 90)}
			data={educationData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'education');
				}
			}}
		/>
	{:else}
		<!-- Skeleton/Placeholder shell for Minimum Education -->
		<div
			class="flex h-[180px] w-full flex-col gap-3 rounded border border-gray-200 bg-white p-3 animate-pulse justify-center"
		>
			<div class="h-4 w-32 bg-gray-200 rounded"></div>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-200 rounded-sm" style="width: 75%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 50%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 25%"></div>
				</div>
			</div>
		</div>
	{/if}

	{#if isMounted}
		<VegaLite
			spec={getSpec('Keywords', 100, 90)}
			data={keywordData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'keyword');
				}
			}}
		/>
	{:else}
		<!-- Skeleton/Placeholder shell for Keywords -->
		<div
			class="flex h-[220px] w-full flex-col gap-3 rounded border border-gray-200 bg-white p-3 animate-pulse justify-center"
		>
			<div class="h-4 w-16 bg-gray-200 rounded"></div>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-200 rounded-sm" style="width: 80%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 60%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 40%"></div>
				</div>
				<div class="flex items-center gap-4">
					<div class="w-24 h-3 bg-gray-200 rounded"></div>
					<div class="h-6 bg-gray-100 rounded-sm" style="width: 30%"></div>
				</div>
			</div>
		</div>
	{/if}
</div>
