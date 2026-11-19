<script lang="ts">
	import Notes from '../Notes.svelte';
	import type { Note } from '$lib/player/cite';
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let {
		beat,
		elapsed,
		duration,
		color,
		reduced = false,
		notes = []
	}: { beat: Extract<Beat, { type: 'timeline' }>; elapsed: number; duration: number; color: string; reduced?: boolean; notes?: Note[] } = $props();

	const n = $derived(beat.points.length);
	const shown = $derived(reduced ? n : Math.min(n, Math.floor((elapsed / Math.max(0.1, duration * 0.8)) * n) + 1));
</script>

<div class="beat" data-beat="timeline">
	<div class="beat-body" data-beat-body use:fit={JSON.stringify(beat.points)} style="--fs: calc(var(--u) * 3.4)">
		<ol style="border-color: {color}">
			{#each beat.points as p, i}
				<li class:rv-hidden={i >= shown}>
					<span class="date" style="color: {color}">{p.date}</span>
					<span>{p.label}</span>
				</li>
			{/each}
		</ol>
		{#if notes.length}<p class="tl-fn"><Notes {notes} /></p>{/if}
	</div>
</div>

<style>
	.tl-fn {
		margin: 0;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0 0 0 0.8em;
		border-left: 0.12em solid;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
	li {
		display: flex;
		flex-direction: column;
	}
	.date {
		font-family: var(--font-mono);
		font-size: 0.8em;
		font-weight: 500;
	}
</style>
