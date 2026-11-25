import { mkdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const filename = path.join(root, 'catalogue-data.js');
const original = await readFile(filename, 'utf8');
const catalogue = runInNewContext(`${original}; catalogue`, {}, { timeout: 1000 });
const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const check = args.includes('--check');
const only = args.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
const platforms = ['amazon', 'flipkart', 'meesho'];
const ids = new Set();

for (const argument of args) {
	if (!['--refresh', '--check'].includes(argument) && !argument.startsWith('--only=')) throw new Error(`Unknown option: ${argument}`);
}
for (const product of catalogue) {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id) || ids.has(product.id)) throw new Error(`Invalid or duplicate id: ${product.id}`);
	ids.add(product.id);
	for (const field of ['name', 'category', 'description']) {
		if (typeof product[field] !== 'string' || !product[field].trim()) throw new Error(`${product.id}: missing ${field}`);
	}
	if (!Array.isArray(product.images)) throw new Error(`${product.id}: images must be an array`);
	if (check && !product.images.length) throw new Error(`${product.id}: add an image URL or run the importer before publishing`);
	for (const image of product.images) {
		if (typeof image !== 'string' || !image) throw new Error(`${product.id}: invalid image`);
		if (image.startsWith('https://')) new URL(image);
		else {
			if (!image.startsWith('assets/products/') || image.includes('..')) throw new Error(`${product.id}: use an HTTPS image URL or assets/products/ path`);
			await access(path.join(root, image));
		}
	}
	for (const platform of platforms) {
		if (!product[platform]) continue;
		const hosts = { amazon: ['amazon.in', 'amzn.in', 'amzn.to'], flipkart: ['flipkart.com', 'dl.flipkart.com', 'fkrt.it', 'fktr.in'], meesho: ['meesho.com'] };
		for (const value of [].concat(product[platform])) {
			const url = new URL(value);
			if (url.protocol !== 'https:' || url.username || url.password || !hosts[platform].includes(url.hostname.replace(/^www\./, ''))) throw new Error(`${product.id}: invalid ${platform} URL`);
		}
	}
}
if (only?.some(id => !ids.has(id))) throw new Error('Unknown product in --only');
if (check) {
	console.log(`Validated ${catalogue.length} products and their image paths.`);
	process.exit(0);
}

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
	if (platform === 'amazon') {
		const encoded = html.match(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:\s*A\.\$\.parseJSON\('((?:\\.|[^'\\])*)'\)/);
		if (encoded) return JSON.parse(encoded[1].replace(/\\'/g, "'")).map(image => image.hiRes || image.large).filter(Boolean);
		const gallery = html.match(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
		if (gallery) return JSON.parse(gallery[1]).map(image => image.hiRes || image.large).filter(Boolean);
		throw new Error(`Amazon gallery unavailable; add direct image URLs to images: ${url}`);
	}
	const script = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
	const product = script && JSON.parse(script[1]).props?.pageProps?.initialState?.product?.details?.data;
	if (!product?.images?.length) throw new Error(`Missing Meesho gallery: ${url}`);
	return product.images;
}

for (const product of catalogue.filter(product => !only || only.includes(product.id))) {
	const candidates = product.images.filter(image => image.startsWith('https://')).map(url => ({ url, platform: 'image' }));
	if (refresh || !product.images.length) {
		for (const platform of platforms) {
			if (!product[platform]) continue;
			for (const listingUrl of [].concat(product[platform])) {
				try {
					for (const url of await gallerySources(listingUrl, platform)) candidates.push({ url, platform });
				} catch (error) {
					console.error(`${product.id}: ${error.message}`);
					process.exitCode = 1;
				}
			}
		}
	}
	const sources = product.imageSources || [];
	for (const { url, platform } of candidates) {
		try {
			let source = sources.find(source => source.url === url);
			if (!source) {
				const response = await request(url);
				const contentType = response.headers.get('content-type')?.split(';')[0];
				const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[contentType];
				if (!extension) throw new Error(`Unexpected image type ${contentType}: ${url}`);
				const bytes = Buffer.from(await response.arrayBuffer());
				const fingerprint = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
				const relative = `assets/products/${product.id}/${fingerprint}.${extension}`;
				await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
				await writeFile(path.join(root, relative), bytes);
				source = { file: relative, url, platform };
				sources.push(source);
			}
			product.images = product.images.map(image => image === url ? source.file : image);
			if (!product.images.includes(source.file)) product.images.push(source.file);
			product.images = [...new Set(product.images)];
		} catch (error) {
			console.error(`${product.id}: ${error.message}`);
			process.exitCode = 1;
		}
	}
	if (sources.length) product.imageSources = sources;
	console.log(`${product.name}: ${product.images.length} photos`);
}
if (await readFile(filename, 'utf8') !== original) throw new Error('Catalogue changed during import; refusing to overwrite your edits.');
await writeFile(`${filename}.tmp`, `const catalogue = ${JSON.stringify(catalogue, null, '\t')};\n`);
await rename(`${filename}.tmp`, filename);
console.log('Catalogue saved. Publish the changed files to update the live website.');