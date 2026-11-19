<script lang="ts">
	import Notes from '../Notes.svelte';
	import type { Note } from '$lib/player/cite';
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let { beat, color, notes = [] }: { beat: Extract<Beat, { type: 'headline' }>; color: string; notes?: Note[] } = $props();
</script>

<div class="beat" data-beat="headline">
	<div class="beat-body" data-beat-body use:fit={beat.text} style="--fs: calc(var(--u) * 5.6)">
		<!-- Sources are footnotes only (Aaron 2026-11-19), so no source chip here. -->
		<h2 style="border-color: {color}">{beat.text}<Notes {notes} /></h2>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1.1;
		border-left: 0.12em solid;
		padding-left: 0.4em;
	}
</style>
