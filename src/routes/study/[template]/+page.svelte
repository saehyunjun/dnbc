<script lang="ts">
	import { onMount } from 'svelte';
	import BeatView from '$lib/components/BeatView.svelte';
	import StageFrame from '$lib/components/StageFrame.svelte';
	import { BEAT_TYPES, SAMPLES } from '$lib/player/samples';
	import type { BeatType } from '$lib/types';

	let { data } = $props();
	const types = $derived<BeatType[]>(data.template === 'all' ? BEAT_TYPES : [data.template as BeatType]);

	let reduced = $state(false);
	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
</script>

<svelte:head>
	<title>Study · {data.template} · DNBC</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-wrap">
	<nav class="site-nav"><a class="brand" href="/">DNBC</a><span>Study: {data.template}</span></nav>
	{#each types as type}
		<section data-study={type}>
			<h2>{type}</h2>
			<div class="grid">
				{#each SAMPLES[type] as s}
					<figure data-sample={s.label}>
						<StageFrame show="Morning Dose" color="#f5b700" clock="7:42 ET" title="Sample segment title" progress={0.5}>
							<BeatView beat={s.beat} elapsed={(s.beat.duration ?? 5) * 0.9} show="Morning Dose" color="#f5b700" {reduced} />
						</StageFrame>
						<figcaption>{s.label}</figcaption>
					</figure>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	h2 {
		text-transform: capitalize;
		margin: 2rem 0 0.6rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr));
		gap: 1rem;
	}
	figure {
		margin: 0;
	}
	figcaption {
		font-size: 0.8rem;
		color: var(--page-muted);
		margin-top: 0.3rem;
	}
</style>
