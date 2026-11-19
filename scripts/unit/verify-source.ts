import assert from 'node:assert/strict';
import { verifySource, htmlToText, sentencesOf } from '../../src/lib/pipeline/verify-source.ts';

const page = (html: string, status = 200, type = 'text/html'): typeof fetch =>
	(async () => new Response(html, { status, headers: { 'content-type': type } })) as unknown as typeof fetch;

const item = (text: string, url = 'https://example.org/a') => ({ url, text });

export const checks: [string, () => void | Promise<void>][] = [
	['passes when every sentence is on the page', async () => {
		const r = await verifySource(item('The trial enrolled 120 adults. Results are not yet posted.'), page('<html><script>var x=1</script><body><p>The trial enrolled 120 adults.</p><p>Results are  not yet\nposted.</p></body></html>'));
		assert.equal(r.ok, true);
		assert.deepEqual(r.missing, []);
		assert.equal(r.status, 200);
	}],
	['reports the missing sentence', async () => {
		const r = await verifySource(item('The trial enrolled 120 adults. The registry reports no result.'), page('<p>The trial enrolled 120 adults.</p><p>Results were posted in 2025.</p>'));
		assert.equal(r.ok, false);
		assert.deepEqual(r.missing, ['The registry reports no result.']);
	}],
	['decodes entities and folds curly quotes and dashes', async () => {
		const r = await verifySource(item('It’s a “phase 2” trial – with 40 patients.'), page('<p>It&#39;s a &quot;phase 2&quot; trial &mdash; with 40&nbsp;patients.</p>'));
		assert.equal(r.ok, true);
		assert.ok(!htmlToText('<style>p{}</style>a').includes('p{}'));
		assert.ok(htmlToText('a &amp; b &#x41;').includes('a & b A'));
	}],
	['a changed number fails', async () => {
		const r = await verifySource(item('The trial enrolled 120 adults.'), page('<p>The trial enrolled 210 adults.</p>'));
		assert.equal(r.ok, false);
	}],
	['fetch failure and bad status fail with a reason', async () => {
		const boom = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
		const a = await verifySource(item('Some long enough sentence here.'), boom);
		assert.equal(a.ok, false);
		assert.match(a.reason ?? '', /network down/);
		const b = await verifySource(item('Some long enough sentence here.'), page('nope', 404));
		assert.equal(b.ok, false);
		assert.equal(b.status, 404);
	}],
	['pdf fails', async () => {
		const r = await verifySource(item('Some long enough sentence here.'), page('%PDF', 200, 'application/pdf'));
		assert.equal(r.ok, false);
		assert.match(r.reason ?? '', /pdf/);
	}],
	['clinicaltrials.gov uses the v2 json', async () => {
		let asked = '';
		const f = (async (u: string) => { asked = u; return new Response(JSON.stringify({ protocolSection: { descriptionModule: { briefSummary: 'Testing semaglutide in early Alzheimer disease.' } } }), { status: 200 }); }) as unknown as typeof fetch;
		const r = await verifySource(item('Testing semaglutide in early Alzheimer disease.', 'https://clinicaltrials.gov/study/NCT04777396'), f);
		assert.equal(r.ok, true);
		assert.equal(asked, 'https://clinicaltrials.gov/api/v2/studies/NCT04777396');
	}],
	['pubmed uses efetch text', async () => {
		let asked = '';
		const f = (async (u: string) => { asked = u; return new Response('Background: the drug reduced decline by 27 percent.', { status: 200 }); }) as unknown as typeof fetch;
		const r = await verifySource(item('The drug reduced decline by 27 percent.', 'https://pubmed.ncbi.nlm.nih.gov/12345/'), f);
		assert.equal(r.ok, true);
		assert.match(asked, /efetch\.fcgi\?db=pubmed&id=12345/);
	}],
	['ellipses split excerpts', () => {
		assert.equal(sentencesOf('First part of the text ... second part of the text').length, 2);
	}]
];
