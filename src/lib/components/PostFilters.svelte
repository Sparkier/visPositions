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

	const uniqueEducations = $derived([...new Set(posts.map((post) => post.education))].sort());
	const uniqueKeywords = $derived(
		[...new Set(posts.flatMap((post) => post.keyword.map((kw) => kw.title)))].sort()
	);
	const jobTypes = ['industry', 'academia'];

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
	<div aria-live="polite" role="status" class="sr-only">
		{#if filteredPosts.length === 1}
			1 matching job found.
		{:else}
			{filteredPosts.length} matching jobs found.
		{/if}
	</div>

	<div class="relative w-full">
		<div class="sr-only">
			<h3>Job Type</h3>
			{#each jobTypes as type}
				<input
					id={`job-type-${type}`}
					type="checkbox"
					checked={type === 'industry' ? industry === true : industry === false}
					onchange={(e) => {
						if (e.currentTarget.checked) {
							industry = type === 'industry';
						} else {
							industry = undefined;
						}
					}}
				/>
				<label for={`job-type-${type}`}>{type}</label>
			{/each}
		</div>
		<VegaLite
			spec={getSpec('Job Type')}
			data={industryData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'industry');
				}
			}}
		/>
	</div>

	<div class="relative w-full">
		<div class="sr-only">
			<h3>Minimum Education</h3>
			{#each uniqueEducations as edu}
				<input
					id={`education-${edu}`}
					type="checkbox"
					checked={education.includes(edu)}
					onchange={(e) => {
						if (e.currentTarget.checked) {
							education = [...education, edu];
						} else {
							education = education.filter((x) => x !== edu);
						}
					}}
				/>
				<label for={`education-${edu}`}>{edu}</label>
			{/each}
		</div>
		<VegaLite
			spec={getSpec('Minimum Education')}
			data={educationData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'education');
				}
			}}
		/>
	</div>

	<div class="relative w-full">
		<div class="sr-only">
			<h3>Keywords</h3>
			{#each uniqueKeywords as kw}
				<input
					id={`keyword-${kw}`}
					type="checkbox"
					checked={keywords.includes(kw)}
					onchange={(e) => {
						if (e.currentTarget.checked) {
							keywords = [...keywords, kw];
						} else {
							keywords = keywords.filter((x) => x !== kw);
						}
					}}
				/>
				<label for={`keyword-${kw}`}>{kw}</label>
			{/each}
		</div>
		<VegaLite
			spec={getSpec('Keywords')}
			data={keywordData}
			options={vegaOptions}
			signalListeners={{
				selected: (name: string, value: unknown) => {
					onselect([name, value], 'keyword');
				}
			}}
		/>
	</div>
</div>
