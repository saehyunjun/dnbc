<script lang="ts">
	import { fit } from '$lib/player/fit';
	import type { Beat } from '$lib/types';

	let { beat, color }: { beat: Extract<Beat, { type: 'stat' }>; color: string } = $props();
</script>

<div class="beat" data-beat="stat">
	<div class="beat-body" data-beat-body use:fit={beat.value + beat.label} style="--fs: calc(var(--u) * 9)">
		<p class="value" style="color: {color}">{beat.value}</p>
		<p class="label">{beat.label}</p>
	</div>
</div>

<style>
	p {
		margin: 0;
	}
	.value {
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1;
		overflow-wrap: anywhere;
	}
	.label {
		font-size: 0.4em;
		color: var(--color-stage-text);
		font-weight: 500;
	}
</style>
