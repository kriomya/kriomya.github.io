import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const cataloguePath = path.join(root, 'catalogue-data.js');
const catalogueSource = await readFile(cataloguePath, 'utf8');
const catalogueJson = catalogueSource.match(/^const catalogue = (\[[\s\S]*\]);\s*$/);
if (!catalogueJson) throw new Error('Expected a JSON array in catalogue-data.js');
const listings = JSON.parse(catalogueJson[1]);

async function request(url) {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
			if (response.ok) return response;
			if (response.status < 500) throw new Error(`${response.status}: ${url}`);
			if (attempt === 2) throw new Error(`${response.status}: ${url}`);
		} catch (error) {
			if (attempt === 2 || !(error instanceof TypeError || error.name === 'TimeoutError')) throw error;
		}
	}
}

async function gallerySources(url, platform) {
	const html = await (await request(url)).text();
	if (platform === 'flipkart') {
		const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
		const products = scripts.flatMap(match => JSON.parse(match[1]));
		const product = products.find(entry => entry['@type'] === 'Product' && entry.sku === new URL(url).searchParams.get('pid'));
		if (!product?.image?.length) throw new Error(`Missing Flipkart gallery: ${url}`);
		return product.image;
	}
	const script = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
	const product = script && JSON.parse(script[1]).props?.pageProps?.initialState?.product?.details?.data;
	if (!product?.images?.length) throw new Error(`Missing Meesho gallery: ${url}`);
	return product.images;
}

const catalogue = [];
for (const listing of listings) {
	// Products maintained with direct image URLs or manual photos already have a gallery.
	if (listing.sample || (listing.images?.length &&
		!listing.images.every(image => listing.imageSources?.some(source => source.file === image)))) {
		catalogue.push(listing);
		continue;
	}
	if (!listing.flipkart && !listing.meesho) {
		catalogue.push(listing);
		continue;
	}
	const images = [];
	const fingerprints = new Set();
	const sources = [];
	for (const platform of ['flipkart', 'meesho']) {
		if (!listing[platform]) continue;
		const urls = await gallerySources(listing[platform], platform);
		for (const [index, url] of urls.entries()) {
			const response = await request(url);
			const contentType = response.headers.get('content-type')?.split(';')[0];
			const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[contentType];
			if (!extension) throw new Error(`Unexpected image type ${contentType}: ${url}`);
			const bytes = Buffer.from(await response.arrayBuffer());
			const fingerprint = createHash('sha256').update(bytes).digest('hex');
			if (fingerprints.has(fingerprint)) continue;
			fingerprints.add(fingerprint);
			const relative = `assets/products/${listing.id}/${platform}-${index + 1}.${extension}`;
			await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
			await writeFile(path.join(root, relative), bytes);
			images.push(relative);
			sources.push({ file: relative, url, platform });
		}
	}
	catalogue.push({ ...listing, images, imageSources: sources });
	console.log(`${listing.name}: ${images.length} photos`);
}
await writeFile(cataloguePath, `const catalogue = ${JSON.stringify(catalogue, null, '\t')};\n`);
console.log(`Imported ${catalogue.length} products and ${catalogue.reduce((total, product) => total + (product.images?.length ?? 0), 0)} photos.`);