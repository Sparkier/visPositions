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
			...posts.map((post) =>
				post.keyword.map((keyword) => {
					return { title: keyword.title, filtered: false };
				})
			),
			...filteredPosts.map((post) =>
				post.keyword.map((keyword) => {
					return { title: keyword.title, filtered: true };
				})
			)
		].flat()
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

	const defaultSpec: VisualizationSpec = {
		$schema: 'https://vega.github.io/schema/vega-lite/v5.json',
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
			y: { field: 'title', type: 'nominal', axis: { title: null, minExtent: 100 } },
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

	const vegaOptions = {
		config: vegaTheme,
		actions: false
	};

	function getSpec(title: string) {
		return {
			...defaultSpec,
			title: title
		};
	}

	function onselect(args: any[], type: string) {
		if (args[1] && typeof args[1] === 'object' && 'title' in args[1]) {
			const elements = args[1].title;
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
		spec={getSpec('Job Type')}
		data={industryData}
		options={vegaOptions}
		signalListeners={{
			selected: (...args) => {
				onselect(args, 'industry');
			}
		}}
	/>
	<VegaLite
		spec={getSpec('Minimum Education')}
		data={educationData}
		options={vegaOptions}
		signalListeners={{
			selected: (...args) => {
				onselect(args, 'education');
			}
		}}
	/>
	<VegaLite
		spec={getSpec('Keywords')}
		data={keywordData}
		options={vegaOptions}
		signalListeners={{
			selected: (...args) => {
				onselect(args, 'keyword');
			}
		}}
	/>
</div>
