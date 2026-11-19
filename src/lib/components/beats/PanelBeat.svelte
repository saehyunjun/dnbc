<script lang="ts">
	import CastPlate from '../CastPlate.svelte';
	import Notes from '../Notes.svelte';
	import type { Note } from '$lib/player/cite';
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let {
		beat,
		elapsed,
		duration,
		reduced = false,
		notes = []
	}: { beat: Extract<Beat, { type: 'panel' }>; elapsed: number; duration: number; reduced?: boolean; notes?: Note[] } = $props();

	// Lines come in turn, each for an equal share of the beat.
	const turn = $derived(
		reduced ? beat.lines.length - 1 : Math.min(beat.lines.length - 1, Math.floor((elapsed / Math.max(0.1, duration)) * beat.lines.length))
	);
</script>

<div class="beat" data-beat="panel">
	<div class="beat-body" data-beat-body use:fit={beat.lines.map((l) => l.text).join('|')} style="--fs: calc(var(--u) * 3.6)">
		{#each beat.lines as line, i}
			<div class="line" class:rv-hidden={i > turn} data-line={i}>
				<CastPlate who={line.who} active={i === turn} />
				<p>{line.text}{#if i === beat.lines.length - 1}<Notes {notes} />{/if}</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.line {
		display: flex;
		flex-direction: column;
		gap: 0.2em;
	}
	p {
		margin: 0;
		font-weight: 500;
	}
</style>
