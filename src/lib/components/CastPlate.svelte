<script lang="ts">
	import { AI_TAG, CAST } from '$lib/channel/cast';
	import type { CastId } from '$lib/types';

	let { who, active = true }: { who: CastId; active?: boolean } = $props();
	const member = $derived(CAST[who]);
</script>

<div class="plate" class:dim={!active} style="--c: {member.color}" data-cast={who}>
	<span class="initial" aria-hidden="true">{member.name.replace(/^(Dr\.|Prof\.)\s*/, '').charAt(0)}</span>
	<span class="text">
		<span class="name">{member.name}</span>
		<span class="role">{member.role}<span class="tag">{AI_TAG}</span></span>
	</span>
</div>

<style>
	.plate {
		display: flex;
		align-items: center;
		gap: 0.55em;
		min-width: 0;
		font-size: 0.62em;
	}
	.plate.dim {
		opacity: 0.7;
	}
	.initial {
		flex: none;
		width: 2.2em;
		height: 2.2em;
		border-radius: 0.4em;
		background: var(--c);
		color: #07111f;
		display: grid;
		place-items: center;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.2em;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.2;
	}
	.name {
		font-weight: 700;
		color: var(--c);
	}
	.role {
		color: var(--color-stage-muted);
		font-size: 0.85em;
	}
	.tag {
		margin-left: 0.6em;
		padding: 0.05em 0.5em;
		border: 1px solid var(--color-stage-line);
		border-radius: 999px;
		font-size: 0.8em;
		white-space: nowrap;
		color: var(--color-stage-text);
	}
</style>
