<script lang="ts">
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let { beat, color, show }: { beat: Extract<Beat, { type: 'bumper' }>; color: string; show: string } = $props();
</script>

<div class="beat" data-beat="bumper">
	<div class="beat-body" data-beat-body use:fit={beat.text} style="--fs: calc(var(--u) * 6)">
		<span class="chip" style="color: {color}">{show}</span>
		<p>{beat.text}</p>
	</div>
</div>

<style>
	p {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
	}
</style>
