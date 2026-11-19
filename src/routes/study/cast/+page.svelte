<script lang="ts">
	import Avatar from '$lib/components/cast/Avatar.svelte';
	import CastPlate from '$lib/components/CastPlate.svelte';
	import { CAST } from '$lib/channel/cast';
	import type { CastId } from '$lib/types';

	const ids = Object.keys(CAST) as CastId[];
</script>

<svelte:head>
	<title>Study · cast · DNBC</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-wrap">
	<nav class="site-nav"><a class="brand" href="/">DNBC</a><span>Study: cast</span></nav>
	<h1>Cast</h1>
	<p class="lede">Six fictional characters. None is a real person.</p>
	<div class="grid" data-cast-grid>
		{#each ids as id}
			<figure data-cast-card={id}>
				<Avatar {id} size="100%" />
				<div class="plate-box"><CastPlate who={id} /></div>
				<figcaption>
					<strong>{CAST[id].name}</strong>
					<span>{CAST[id].role}</span>
				</figcaption>
			</figure>
		{/each}
	</div>
</div>

<style>
	h1 {
		margin: 1rem 0 0.2rem;
	}
	.lede {
		color: var(--page-muted);
		margin: 0 0 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
		gap: 1rem;
	}
	figure {
		margin: 0;
	}
	figcaption {
		display: flex;
		flex-direction: column;
		margin-top: 0.4rem;
		font-size: 0.9rem;
	}
	figcaption span {
		color: var(--page-muted);
		font-size: 0.8rem;
	}
	.plate-box {
		margin-top: 0.5rem;
		padding: 0.6rem;
		background: var(--color-stage);
		color: var(--color-stage-text);
		border-radius: 0.4rem;
		font-size: 1.3rem;
	}
</style>
