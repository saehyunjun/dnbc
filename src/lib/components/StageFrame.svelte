<script lang="ts">
	import type { Snippet } from 'svelte';
	import FootnoteStrip from './FootnoteStrip.svelte';
	import type { Note } from '$lib/player/cite';

	// The 16:9 picture: DNBC bug, show clock, the beat, and the lower third.
	let {
		show,
		color,
		clock,
		title,
		opinion = false,
		progress = 0,
		beatKey = '',
		notes,
		crisis = false,
		children
	}: {
		show: string;
		color: string;
		clock: string;
		title?: string;
		opinion?: boolean;
		progress?: number;
		beatKey?: string;
		/** Footnotes for the current beat. Undefined when the segment has no citations (no strip). */
		notes?: Note[];
		/** Show the crisis line under the picture (segments that mention suicide, self-harm, or overdose). */
		crisis?: boolean;
		children: Snippet;
	} = $props();
</script>

<div class="frame">
<div class="stage" data-stage data-beat-key={beatKey}>
	<div class="top">
		<span class="bug">DNBC</span>
		<span class="clock" data-show-clock>{show}, {clock}</span>
	</div>
	<div class="screen">{@render children()}</div>
	{#if notes}<FootnoteStrip {notes} />{/if}
	<div class="lower" style="--show: {color}">
		<span class="show-name" data-show-name>{show}</span>
		<span class="seg" data-segment-title>{title ?? ''}</span>
		{#if opinion}<span class="opinion" data-opinion>Opinion</span>{/if}
	</div>
	<div class="progress"><span style="width: {Math.min(100, Math.max(0, progress * 100))}%; background: {color}"></span></div>
</div>
{#if crisis}
	<p class="crisis" data-crisis>If you are thinking about suicide or self-harm, call or text <a href="tel:988">988</a> (Suicide and Crisis Lifeline, US). Outside the US, <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">find a helpline</a>.</p>
{/if}
</div>

<style>
	.crisis {
		margin: 0.5rem 0 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-stage-line, #334);
		border-radius: 6px;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.crisis a {
		color: inherit;
		font-weight: 700;
	}
	.frame {
		container: stage / inline-size;
	}
	.stage {
		--u: 1cqw;
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: radial-gradient(120% 140% at 20% 0%, var(--color-stage-raised), var(--color-stage) 70%);
		color: var(--color-stage-text);
		overflow: hidden;
		border-radius: 0.5rem 0.5rem 0 0;
	}
	@container stage (max-width: 620px) {
		.stage {
			--u: 1.5cqw;
		}
	}
	@media (max-width: 639px) {
		.stage {
			aspect-ratio: 1 / 1;
		}
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc(var(--u) * 1.4) calc(var(--u) * 2.2) 0;
		font-size: calc(var(--u) * 2.2);
		flex: none;
	}
	.bug {
		background: var(--color-brand);
		color: #07111f;
		font-family: var(--font-display);
		font-weight: 800;
		padding: 0.15em 0.6em;
		border-radius: 0.25em;
		letter-spacing: 0.04em;
	}
	.clock {
		font-family: var(--font-mono);
		color: var(--color-stage-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		margin-left: 1em;
	}
	.screen {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	.lower {
		flex: none;
		display: flex;
		align-items: stretch;
		font-size: calc(var(--u) * 2.2);
		border-top: 2px solid var(--show);
		background: rgba(3, 7, 13, 0.7);
		min-width: 0;
	}
	.show-name {
		background: var(--show);
		color: #07111f;
		font-family: var(--font-display);
		font-weight: 800;
		padding: 0.5em 0.9em;
		white-space: nowrap;
	}
	.seg {
		flex: 1;
		min-width: 0;
		padding: 0.5em 0.9em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.opinion {
		align-self: center;
		margin-right: 0.6em;
		padding: 0.1em 0.6em;
		border: 1px solid var(--color-brand);
		color: var(--color-brand);
		border-radius: 999px;
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.8em;
		letter-spacing: 0.06em;
	}
	.progress {
		height: 3px;
		background: var(--color-stage-line);
		flex: none;
	}
	.progress span {
		display: block;
		height: 100%;
	}
</style>
