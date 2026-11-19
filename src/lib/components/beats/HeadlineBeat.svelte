<script lang="ts">
	import { fit } from '$lib/player/fit';
	import { sourceLabel } from '$lib/player/format';
	import type { Beat } from '$lib/types';

	let { beat, color }: { beat: Extract<Beat, { type: 'headline' }>; color: string } = $props();
</script>

<div class="beat" data-beat="headline">
	<div class="beat-body" data-beat-body use:fit={beat.text} style="--fs: calc(var(--u) * 5.6)">
		<span class="chip" style="color: {color}">{sourceLabel(beat.sources)}</span>
		<h2 style="border-color: {color}">{beat.text}</h2>
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
