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
	}: { beat: Extract<Beat, { type: 'list' }>; elapsed: number; duration: number; color: string; reduced?: boolean; notes?: Note[] } = $props();

	const n = $derived(beat.items.length);
	const shown = $derived(reduced ? n : Math.min(n, Math.floor((elapsed / Math.max(0.1, duration * 0.7)) * n) + 1));
</script>

<div class="beat" data-beat="list">
	<div class="beat-body" data-beat-body use:fit={beat.title + beat.items.join('|')} style="--fs: calc(var(--u) * 3.6)">
		<h2 style="color: {color}">{beat.title}<Notes {notes} /></h2>
		<ol>
			{#each beat.items as item, i}
				<li class:rv-hidden={i >= shown}><span class="num" style="color: {color}">{i + 1}</span><span>{item}</span></li>
			{/each}
		</ol>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.2em;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35em;
	}
	li {
		display: flex;
		gap: 0.6em;
	}
	.num {
		flex: none;
		font-family: var(--font-mono);
		width: 1.2em;
	}
</style>
