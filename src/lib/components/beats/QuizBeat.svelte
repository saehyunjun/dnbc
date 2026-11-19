<script lang="ts">
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let {
		beat,
		elapsed,
		duration,
		color
	}: { beat: Extract<Beat, { type: 'quiz' }>; elapsed: number; duration: number; color: string } = $props();

	// The answer comes at half the beat. Its space is held from the start.
	const revealed = $derived(elapsed >= duration / 2);
</script>

<div class="beat" data-beat="quiz" data-revealed={revealed}>
	<div class="beat-body" data-beat-body use:fit={beat.clue + beat.answer} style="--fs: calc(var(--u) * 4.4)">
		<span class="chip" style="color: {color}">Name that mechanism</span>
		<p class="clue">{beat.clue}</p>
		<p class="answer" class:rv-hidden={!revealed} style="color: {color}">{beat.answer}</p>
	</div>
</div>

<style>
	p {
		margin: 0;
	}
	.clue {
		font-weight: 500;
	}
	.answer {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.3em;
	}
</style>
