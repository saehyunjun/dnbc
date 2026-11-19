<script lang="ts">
	import Notes from '../Notes.svelte';
	import type { Note } from '$lib/player/cite';
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let { beat, color, notes = [] }: { beat: Extract<Beat, { type: 'pipeline' }>; color: string; notes?: Note[] } = $props();

	const max = $derived(Math.max(1, ...beat.phases.map((p) => p.count)));
	const rows = $derived(
		[...beat.phases].sort((a, b) => a.phase.localeCompare(b.phase, undefined, { numeric: true }))
	);
	const hit = (phase: string) => !!beat.highlight && beat.highlight.toLowerCase() === phase.toLowerCase();
</script>

<div class="beat" data-beat="pipeline">
	<div class="beat-body" data-beat-body use:fit={JSON.stringify(beat.phases)} style="--fs: calc(var(--u) * 3.4)">
		<h2>{beat.sponsor}{#if beat.drug}<span> · {beat.drug}</span>{/if}<Notes {notes} /></h2>
		<div class="bars">
			{#each rows as r}
				<div class="row" class:hit={hit(r.phase)}>
					<span class="label">{r.phase}</span>
					<span class="track"><span class="bar" style="width: {(r.count / max) * 100}%; background: {hit(r.phase) ? color : 'var(--color-stage-line)'}"></span></span>
					<span class="n">{r.count}</span>
				</div>
			{/each}
		</div>
		{#if beat.highlight && !rows.some((r) => hit(r.phase))}
			<p class="note" style="color: {color}">New: {beat.highlight}</p>
		{/if}
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.3em;
	}
	h2 span {
		color: var(--color-stage-muted);
		font-weight: 600;
	}
	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}
	.row {
		display: grid;
		grid-template-columns: 5.5em 1fr 2.6em;
		align-items: center;
		gap: 0.6em;
	}
	.label {
		color: var(--color-stage-muted);
	}
	.hit .label,
	.hit .n {
		color: var(--color-stage-text);
		font-weight: 700;
	}
	.track {
		display: block;
		height: 0.8em;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 0.2em;
		overflow: hidden;
	}
	.bar {
		display: block;
		height: 100%;
		border-radius: 0.2em;
	}
	.n {
		text-align: right;
		font-family: var(--font-mono);
	}
	.note {
		margin: 0;
		font-weight: 700;
	}
</style>
