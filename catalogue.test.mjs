import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { runInNewContext, Script } from 'node:vm';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const catalogue = runInNewContext(`${await readFile(path.join(root, 'catalogue-data.js'), 'utf8')}; catalogue`);

test('storefront settings feature bedding first and reference existing images', async () => {
	const settings = runInNewContext(`${await readFile(path.join(root, 'catalogue-settings.js'), 'utf8')}; catalogueSettings`);
	assert.equal(Object.keys(settings.collections)[0], 'Bedsheets');
	assert.ok(settings.featuredBedsheets.length > 0);
	for (const id of settings.featuredBedsheets) assert.ok(catalogue.some(product => product.id === id && product.category === 'Bedsheets'));
	assert.ok(catalogue.some(product => product.id === settings.featuredJewellery && product.category !== 'Bedsheets'));
	for (const [id, image] of Object.entries(settings.covers)) {
		assert.ok(catalogue.some(product => product.id === id));
		await readFile(path.join(root, image));
	}
	new Script(await readFile(path.join(root, 'storefront.js'), 'utf8'));
});

test('catalogue passes validation and retains supplied marketplace listings', () => {
	const result = spawnSync(process.execPath, [path.join(root, 'import-catalogue.mjs'), '--check'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	for (const [platform, expected] of Object.entries({ amazon: 5, flipkart: 13, meesho: 15 })) {
		for (const product of catalogue) {
			assert.ok(!product[platform] || typeof product[platform] === 'string', `${product.id}: keep one ${platform} URL`);
		}
		const urls = catalogue.flatMap(product => [].concat(product[platform] || [])).filter(Boolean);
		assert.equal(new Set(urls).size, urls.length, `${platform}: repeated URL across products`);
		assert.ok(new Set(urls).size >= expected, `${platform}: expected at least ${expected} listings`);
	}
	for (const asin of ['B0HSQPCZL2', 'B0HSSCG1MP', 'B0HSSKYRN2', 'B0HST1912F', 'B0HSSR8V4K']) {
		assert.ok(catalogue.some(product => product.amazon === `https://www.amazon.in/dp/${asin}`));
	}
	const ring = catalogue.find(product => product.id === 'crystal-butterfly-ring');
	assert.equal([].concat(ring.meesho).length, 1);
	assert.ok(ring.meesho.endsWith('/j5m5m7'));
	const pendant = catalogue.find(product => product.id === 'open-gold-heart-pendant');
	assert.equal(pendant.meesho, 'https://www.meesho.com/gold-heart-pendant-with-chain-for-women/p/jc8piv');
	assert.equal(pendant.images.length, 4);
	assert.equal(new Set(pendant.images).size, 4);
	assert.ok(pendant.images.every(image => image.startsWith('assets/products/open-gold-heart-pendant/')));
	assert.equal(pendant.imageSources.length, 4);
	assert.ok(pendant.imageSources.every(source => pendant.images.includes(source.file) && source.url.includes('/1169419063/')));
});

test('marketplace controls show one link per platform and reject unsafe hosts', async () => {
	const html = await readFile(path.join(root, 'index.html'), 'utf8');
	const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
	new Script(script);
	const makeElement = () => ({ children: [], attributes: {}, dataset: {}, append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; }, setAttribute(name, value) { this.attributes[name] = value; } });
	const container = makeElement();
	const context = { URL, document: { createElement: makeElement }, container };
	runInNewContext(script.slice(0, script.indexOf('const productGrid')) + script.slice(script.indexOf('function createIcon'), script.indexOf('function addGallery')) + `
		addMarketplaceLinks(container, {name: 'Test', amazon: 'https://www.amazon.in/dp/B0HSQPCZL2', meesho: ['https://www.meesho.com/p/one', 'https://www.meesho.com/p/two']});
	`, context);
	assert.deepEqual(container.children.map(control => control.textContent), ['Amazon', 'Meesho']);
	assert.equal(container.children[1].href, 'https://www.meesho.com/p/one');
	assert.equal(context.marketplaceUrls({ meesho: ['javascript:alert(1)', 'https://www.meesho.com/p/two'] }, 'meesho')[0], 'https://www.meesho.com/p/two');
	for (const control of container.children) assert.equal(control.rel, 'noopener noreferrer');
	for (const url of ['http://amazon.in/', 'https://amazon.in.evil.com/', 'https://user:password@amazon.in/', 'javascript:alert(1)']) {
		assert.equal(context.validMarketplaceUrl(url, 'amazon'), null);
	}
	assert.equal(context.marketplaceUrls({ meesho: ['https://www.meesho.com/p/one', 'https://www.meesho.com/p/one'] }, 'meesho').length, 1);
	assert.equal(context.availabilityText({ amazon: 'https://www.amazon.in/dp/B0HSQPCZL2' }), 'View listing on Amazon');
	context.addMarketplaceLinks(container, { sample: true, amazon: 'https://www.amazon.in/dp/B0HSQPCZL2' });
	assert.equal(container.children.length, 0);
});

test('importer preserves custom fields and old photos when a download fails', async context => {
	const directory = await mkdtemp(path.join(tmpdir(), 'kriomya-test-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	await copyFile(path.join(root, 'import-catalogue.mjs'), path.join(directory, 'import-catalogue.mjs'));
	await mkdir(path.join(directory, 'assets/products/test'), { recursive: true });
	await writeFile(path.join(directory, 'assets/products/test/original.png'), 'existing-photo');
	const fixture = [{ id: 'test', name: 'Test product', category: 'Test', description: 'Test description', price: 123, customField: 'keep me', images: ['assets/products/test/original.png', 'https://example.com/good.png', 'https://example.com/fail.png'] }];
	const filename = path.join(directory, 'catalogue-data.js');
	await writeFile(filename, `const catalogue = ${JSON.stringify(fixture)};`);
	const mock = `globalThis.fetch = async url => url.includes('fail') ? new Response('Missing', {status: 404}) : new Response(new Uint8Array([137,80,78,71]), {headers: {'content-type':'image/png'}});`;
	const result = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(mock)}`, path.join(directory, 'import-catalogue.mjs')], { encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /404/);
	const updated = runInNewContext(`${await readFile(filename, 'utf8')}; catalogue`)[0];
	assert.equal(updated.price, 123);
	assert.equal(updated.customField, 'keep me');
	assert.ok(updated.images.includes('assets/products/test/original.png'));
	assert.ok(updated.images.includes('https://example.com/fail.png'));
	assert.ok(!updated.images.includes('https://example.com/good.png'));
	assert.equal(updated.imageSources[0].url, 'https://example.com/good.png');
	await readFile(path.join(directory, updated.imageSources[0].file));
	fixture[0].images = [];
	await writeFile(filename, `const catalogue = ${JSON.stringify(fixture)};`);
	const check = spawnSync(process.execPath, [path.join(directory, 'import-catalogue.mjs'), '--check'], { encoding: 'utf8' });
	assert.notEqual(check.status, 0);
	assert.match(check.stderr, /add an image URL/);
});