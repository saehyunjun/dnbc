<script lang="ts">
	import type { Note } from '$lib/player/cite';

	// Superscript footnote numbers after a beat's main text.
	let { notes }: { notes: Note[] } = $props();
</script>

{#if notes.length}<sup class="fn" data-fn>{notes.map((x) => x.n).join(',')}</sup>{/if}

<style>
	.fn {
		font-size: 0.5em;
		font-weight: 600;
		font-style: normal;
		color: var(--color-stage-muted);
		margin-left: 0.25em;
		vertical-align: super;
		line-height: 0;
		letter-spacing: 0.02em;
	}
</style>
