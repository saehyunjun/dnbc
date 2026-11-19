<script lang="ts">
	let { current }: { current: 'watch' | 'schedule' } = $props();
</script>

<nav class="site-nav" aria-label="Main">
	<a class="brand" href="/">DNBC</a>
	<span>
		<a href="/" aria-current={current === 'watch' ? 'page' : undefined} style:font-weight={current === 'watch' ? 700 : 400}>Watch</a>
		&nbsp;&nbsp;
		<a href="/schedule" aria-current={current === 'schedule' ? 'page' : undefined} style:font-weight={current === 'schedule' ? 700 : 400}>Schedule</a>
	</span>
</nav>
