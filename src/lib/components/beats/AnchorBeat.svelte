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
	}: { beat: Extract<Beat, { type: 'anchor' }>; elapsed: number; duration: number; reduced?: boolean; notes?: Note[] } = $props();

	// Typed out over the first 40% of the beat. The whole line holds its place from the start.
	const shown = $derived(
		reduced ? beat.text.length : Math.min(beat.text.length, Math.ceil((elapsed / Math.max(0.1, duration * 0.4)) * beat.text.length))
	);
</script>

<div class="beat" data-beat="anchor">
	<div class="beat-body" data-beat-body use:fit={beat.text} style="--fs: calc(var(--u) * 4.4)">
		<CastPlate who={beat.who} />
		<p>
			<span data-caption>{beat.text.slice(0, shown)}</span><span class="rv-hidden" aria-hidden="true">{beat.text.slice(shown)}</span><Notes {notes} />
		</p>
	</div>
</div>

<style>
	p {
		margin: 0;
		font-weight: 500;
	}
</style>
