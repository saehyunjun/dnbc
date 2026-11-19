<script lang="ts">
	import SiteNav from '$lib/components/SiteNav.svelte';
</script>

<svelte:head>
	<title>About · DNBC</title>
	<meta name="description" content="What DNBC is, where its facts come from, and how to report a mistake." />
</svelte:head>

<div class="page-wrap" data-about>
	<SiteNav current="about" />
	<h1>About DNBC</h1>
	<p class="sub">A text-only channel about drug development in neurology, psychiatry, and brain cancers. It runs around the clock.</p>

	<section class="crisis" data-crisis-about>
		<h2>If you need help now</h2>
		<p>If you are thinking about suicide or self-harm, call or text <a href="tel:988">988</a> (Suicide and Crisis Lifeline, US). Outside the US, <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">find a helpline</a>. In an emergency, call your local emergency number.</p>
	</section>

	<h2>What you are watching</h2>
	<ul>
		<li>Segments are built from FDA notices, ClinicalTrials.gov, company press releases, research papers, and public posts.</li>
		<li>The anchors and panelists are AI characters. None is a real person.</li>
		<li>Every fact on screen has a numbered footnote that names its source and date. Quotes are word for word.</li>
		<li>Each segment shows the date its facts were checked. Older segments air again overnight and at weekends.</li>
		<li>Nothing here is medical advice. Talk to your doctor before changing any treatment.</li>
	</ul>

	<h2>Report a mistake</h2>
	<p>Open an issue on <a href="https://github.com/saehyunjun/dnbc/issues" target="_blank" rel="noopener noreferrer">GitHub</a> with the time you saw it and what was wrong. A wrong segment is taken off the air first and checked after.</p>
</div>

<style>
	h1 {
		margin: 0.5rem 0 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 2rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 2rem 0 0.6rem;
	}
	.sub {
		color: var(--page-muted);
		margin: 0.3rem 0 0;
	}
	ul {
		padding-left: 1.2rem;
		line-height: 1.5;
	}
	.crisis {
		margin-top: 1.5rem;
		padding: 0.2rem 1rem 0.6rem;
		border: 1px solid var(--page-line);
		border-radius: 8px;
	}
	.crisis h2 {
		margin-top: 0.8rem;
	}
	a {
		color: inherit;
		font-weight: 600;
	}
</style>
