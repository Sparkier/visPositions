<script lang="ts">
	import type { Post } from '$lib/types';
	import vegaTheme, { markColor } from '$lib/vegaTheme';
	import { VegaLite, type VisualizationSpec } from 'svelte-vega';

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
</div>
