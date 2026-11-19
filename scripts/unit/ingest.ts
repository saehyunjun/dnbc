import assert from 'node:assert/strict';
import { guessEntities } from '../../src/lib/ingest/entities.ts';
import { parseRss, rssDate } from '../../src/lib/ingest/rss.ts';
import { classifyFda, isDrugNews, extractFdaBody } from '../../src/lib/ingest/fda.ts';
import { toItem as crlItem, crlDate } from '../../src/lib/ingest/fda-crl.ts';
import { approvalsOf } from '../../src/lib/ingest/drugsfda.ts';
import { classifyRelease, isDrugDevelopment, extractRelease } from '../../src/lib/ingest/wires.ts';
import { parseHits, searchUrl } from '../../src/lib/ingest/edgar.ts';
import { parseArticles, buildTerm } from '../../src/lib/ingest/pubmed.ts';
import { toItem as bskyItem, postUrl } from '../../src/lib/ingest/bluesky.ts';
import { toItem as quoteItem } from '../../src/lib/ingest/quotes.ts';
import { userAgent } from '../../src/lib/ingest/http.ts';

const RSS = `<rss><channel><item><title>FDA Approves Drug X</title><link>http://www.fda.gov/a</link><description><![CDATA[<p>Text &amp; more</p>]]></description><pubDate>Wed, 18 Nov 2026 14:13:26 EST</pubDate><dc:creator>FDA</dc:creator></item></channel></rss>`;

export const checks: [string, () => void | Promise<void>][] = [
	['guessEntities finds INN, code names, and NCT ids', () => {
		const e = guessEntities('Phase 3 of tirzepatide and ABC-1234 (NCT01234567), plus nivolumab.');
		assert.deepEqual(e.nctIds, ['NCT01234567']);
		assert.ok(e.drugs.includes('nivolumab') && e.drugs.includes('ABC-1234'));
		assert.deepEqual(e.conditions, []);
	}],
	['guessEntities ignores COVID-19 as a code', () => {
		assert.ok(!guessEntities('COVID-19 vaccine').drugs.includes('COVID-19'));
	}],
	['parseRss reads item fields and CDATA', () => {
		const [r] = parseRss(RSS);
		assert.equal(r.title, 'FDA Approves Drug X');
		assert.equal(r.description, 'Text & more');
		assert.equal(r.creator, 'FDA');
	}],
	['rssDate converts EST', () => {
		assert.equal(rssDate('Wed, 18 Nov 2026 14:13:26 EST'), '2026-11-18T19:13:26.000Z');
	}],
	['classifyFda: approval, crl, adcomm, other', () => {
		assert.equal(classifyFda('FDA Approves First Drug to Treat X'), 'approval');
		assert.equal(classifyFda('FDA Issues Complete Response Letter'), 'crl');
		assert.equal(classifyFda('FDA Announces Advisory Committee Meeting on X'), 'adcomm');
		assert.equal(classifyFda('FDA Launches a Program'), 'other');
	}],
	['isDrugNews drops unrelated releases', () => {
		assert.equal(isDrugNews('FDA Warns About Pet Food Labels', 'Labels on pet food.'), false);
		assert.equal(isDrugNews('FDA Approves First Drug for X'), true);
	}],
	['extractFdaBody keeps the article and drops nav and footer', () => {
		const html = '<nav>MENU</nav><div class="col-md-8" role="main"><p>For Immediate Release</p><p>FDA today approved X.</p><p>Content current as of: 11/18/2026</p></article><footer>FOOT</footer>';
		const t = extractFdaBody(html);
		assert.ok(t.includes('FDA today approved X.'));
		assert.ok(!t.includes('MENU') && !t.includes('FOOT') && !t.includes('Content current'));
	}],
	['CRL record becomes a crl item', () => {
		const it = crlItem({ letter_date: '11/13/2026', company_name: 'Acme Bio', application_number: ['BLA 761524'], file_name: 'CRL_BLA761524_20261113.pdf', text: 'COMPLETE RESPONSE for ivonescimab' }, '2026-11-18T00:00:00Z');
		assert.equal(it.kind, 'crl');
		assert.equal(it.source, 'fda-crl');
		assert.equal(it.publishedAt, '2026-11-13T00:00:00Z');
		assert.deepEqual(it.entities.sponsors, ['Acme Bio']);
		assert.equal(crlDate('bad').length > 10, true);
	}],
	['approvalsOf keeps original NDA approvals on the day and drops ANDAs', () => {
		const nda = { application_number: 'NDA208411', sponsor_name: 'EMERGENT', openfda: { brand_name: ['NARCAN'], generic_name: ['NALOXONE'] }, submissions: [{ submission_type: 'ORIG', submission_status: 'AP', submission_status_date: '20151118' }, { submission_type: 'SUPPL', submission_status: 'AP', submission_status_date: '20161118' }] };
		const a = approvalsOf(nda, '20151118');
		assert.equal(a.length, 1);
		assert.deepEqual([a[0].brand, a[0].sponsor, a[0].date], ['Narcan', 'Emergent', '2015-11-18']);
		assert.equal(approvalsOf(nda, '20161118').length, 0);
		assert.equal(approvalsOf({ ...nda, application_number: 'ANDA123456' }).length, 0);
	}],
	['classifyRelease covers approval, crl, readout, deal, pdufa, other', () => {
		assert.equal(classifyRelease('Acme Receives FDA Approval for Foo'), 'approval');
		assert.equal(classifyRelease('Acme Announces Complete Response Letter for Foo'), 'crl');
		assert.equal(classifyRelease('Acme Announces Topline Results From Phase 3 Trial'), 'readout');
		assert.equal(classifyRelease('Acme to Acquire Beta Therapeutics'), 'deal');
		assert.equal(classifyRelease('Acme Announces FDA Acceptance of NDA', 'The PDUFA target action date is March 3.'), 'pdufa');
		assert.equal(classifyRelease('Acme Opens New Office'), 'other');
	}],
	['isDrugDevelopment keeps trial news and drops event notices', () => {
		assert.equal(isDrugDevelopment('Acme Doses First Patient in Phase 2 Trial'), true);
		assert.equal(isDrugDevelopment('Acme Launches New Loyalty Program for Pet Owners'), false);
		assert.equal(isDrugDevelopment('Acme to Participate in Investor Conference', 'biotech'), false);
	}],
	['extractRelease reads the issuer and body', () => {
		const html = '<meta name="author" content="Acme Bio, Inc."><section class="release-body"><div class="release-content"><p>BOSTON -- Acme today.</p></div></section><footer>x</footer>';
		const r = extractRelease(html);
		assert.equal(r.sponsor, 'Acme Bio, Inc.');
		assert.ok(r.text.includes('Acme today.'));
	}],
	['EDGAR parseHits keeps Exhibit 99 of biotech SIC and builds the URL', () => {
		const res = { hits: { hits: [
			{ _id: '0001234567-26-000012:ex99-1.htm', _source: { ciks: ['0001234567'], display_names: ['Acme Bio, Inc.  (ACME)  (CIK 0001234567)'], file_date: '2026-11-17', file_type: 'EX-99.1', sics: ['2834'] } },
			{ _id: '0001234567-26-000012:main.htm', _source: { ciks: ['0001234567'], file_type: '8-K', sics: ['2834'] } },
			{ _id: '0009999999-26-000001:ex99.htm', _source: { ciks: ['0009999999'], file_type: 'EX-99.1', sics: ['3674'] } }
		] } };
		const f = parseHits(res);
		assert.equal(f.length, 1);
		assert.equal(f[0].url, 'https://www.sec.gov/Archives/edgar/data/1234567/000123456726000012/ex99-1.htm');
		assert.equal(f[0].company, 'Acme Bio, Inc.');
		assert.ok(searchUrl('"phase 3"', '2026-11-16', '2026-11-18').includes('forms=8-K'));
	}],
	['EDGAR throws the DNBC_CONTACT error when unset', async () => {
		const saved = process.env.DNBC_CONTACT;
		delete process.env.DNBC_CONTACT;
		try {
			assert.throws(() => userAgent(true), /DNBC_CONTACT/);
		} finally {
			if (saved !== undefined) process.env.DNBC_CONTACT = saved;
		}
	}],
	['PubMed parseArticles reads title, structured abstract, journal, date', () => {
		const xml = `<PubmedArticle><MedlineCitation><PMID Version="1">123</PMID><Article><Journal><JournalIssue><PubDate><Year>2026</Year><Month>Nov</Month><Day>5</Day></PubDate></JournalIssue><Title>Lancet Oncology</Title></Journal><ArticleTitle>A phase 3 trial of X</ArticleTitle><Abstract><AbstractText Label="BACKGROUND">Why.</AbstractText><AbstractText Label="FINDINGS">It worked (NCT01234567).</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>`;
		const [a] = parseArticles(xml);
		assert.equal(a.pmid, '123');
		assert.equal(a.date, '2026-11-05');
		assert.equal(a.journal, 'Lancet Oncology');
		assert.ok(a.abstract.startsWith('BACKGROUND: Why.\nFINDINGS:'));
		assert.ok(buildTerm().includes('"N Engl J Med"[ta]'));
	}],
	['Bluesky item keeps handle only and builds the post URL', () => {
		const p = { uri: 'at://did:plc:x/app.bsky.feed.post/3abc', author: { handle: 'a.bsky.social', displayName: 'Real Name' } as { handle: string }, record: { text: 'A long enough post about a phase 3 trial result today.', createdAt: '2026-11-18T10:00:00Z' } };
		const it = bskyItem(p, 'phase 3', 'now');
		assert.deepEqual(it?.speaker, { handle: 'a.bsky.social' });
		assert.equal(it?.tier, 'social');
		assert.equal(postUrl(p), 'https://bsky.app/profile/a.bsky.social/post/3abc');
		assert.equal(bskyItem({ ...p, record: { text: 'short' } }, 'k', 'now'), undefined);
	}],
	['Reddit quote has community only and no url; LinkedIn keeps name and role', () => {
		const r = quoteItem({ text: 'We waited four years for a diagnosis.', community: 'r/rarediseases', date: '2026-11-10', url: 'https://reddit.com/x', topic: 'diagnosis' }, 'reddit', '2026-11-18T00:00:00Z');
		assert.equal(r?.url, '');
		assert.deepEqual(r?.speaker, { community: 'r/rarediseases' });
		const l = quoteItem({ text: 'Trial access matters.', name: 'A B', role: 'Patient advocate', date: '2026-11-10', url: 'https://linkedin.com/y', topic: 't' }, 'linkedin', 'now');
		assert.equal(l?.url, 'https://linkedin.com/y');
		assert.deepEqual(l?.speaker, { name: 'A B', role: 'Patient advocate' });
		assert.equal(quoteItem({ text: ' ', date: '2026-11-10', topic: 't' }, 'reddit', 'now'), undefined);
	}]
];
