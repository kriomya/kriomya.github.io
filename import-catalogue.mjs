import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const listings = [
	{
		id: 'pink-heart-pendant', name: 'Pink Heart Pendant Set', category: 'Necklaces',
		description: 'Pink heart pendant with a chain and cubic zirconia detailing.',
		flipkart: 'https://www.flipkart.com/kriomya-heart-pink-pendant-cubic-zirconia-stainless-steel-set/p/itmfa1ae9e8bb025?pid=PELHT2NP3SH9GHRU', meesho: ''
	},
	{
		id: 'crystal-butterfly-ring', name: 'Crystal Butterfly Ring', category: 'Rings',
		description: 'Silver-tone butterfly ring with crystal detailing and an adjustable band.',
		flipkart: 'https://www.flipkart.com/kriomya-crystal-butterfly-ring-alloy/p/itm5c7e99ae44638?pid=RNGHT9ZYWAPSNEQQ',
		meesho: 'https://www.meesho.com/silver-adjustable-finger-ring-for-women-butterfly-crystal-design-western-party-kriomya/p/j5m5m7'
	},
	{
		id: 'floral-rose-armlet', name: 'Golden Floral Rose Armlet', category: 'Armlets',
		description: 'Golden rose motifs and twisted-wire detailing in an open armlet.',
		flipkart: 'https://www.flipkart.com/kriomya-alloy-armlet/p/itm93494a977d6cb?pid=BBAHT84GDWJGFFBR',
		meesho: 'https://www.meesho.com/kriomya-floral-armlet/p/j88k38'
	},
	{
		id: 'pink-heart-ring', name: 'Pink Heart Halo Ring', category: 'Rings',
		description: 'A pink heart-shaped stone framed by a sparkling halo.',
		flipkart: 'https://www.flipkart.com/kriomya-pink-heart-halo-ring-alloy-crystal/p/itm71874258b3ec3?pid=RNGHT9Y6KAPGXPMM',
		meesho: 'https://www.meesho.com/kriomya-pink-heart-shape-stone-ring-for-women/p/j87vi6'
	},
	{
		id: 'butterfly-pearl-studs', name: 'Butterfly Pearl Stud Earrings', category: 'Earrings',
		description: 'Gold-tone butterfly studs with white artificial pearls and cubic zirconia.',
		flipkart: 'https://www.flipkart.com/kriomya-butterfly-pearl-stud-earrings-cubic-zirconia-alloy-earring/p/itm994ce2a44c101?pid=ERGHSTJZURKHJPFV',
		meesho: 'https://www.meesho.com/kriomya-butterfly-pearl-stud-earrings-cubic-zirconia-alloy-stud-earring/p/j56y9v'
	},
	{
		id: 'golden-disc-earrings', name: 'Layered Golden Disc Earrings', category: 'Earrings',
		description: 'Layered golden discs with a contemporary drop silhouette.',
		flipkart: 'https://www.flipkart.com/kriomya-layered-golden-disc-earrings-alloy-hoop-earring-drops-danglers/p/itm1967723ac36cb?pid=ERGHSVW49DURQTFG', meesho: ''
	},
	{
		id: 'butterfly-leaf-ring', name: 'Butterfly Leaf Adjustable Ring', category: 'Rings',
		description: 'Silver-tone butterfly and leaf details on an adjustable band.',
		flipkart: 'https://www.flipkart.com/kriomya-butterfly-leaf-adjustable-ring-alloy-silver-plated/p/itm009f282a2a8bd?pid=RNGHSNZZKXEWTBY4',
		meesho: 'https://www.meesho.com/kriomya-butterfly-leaf-adjustable-ring-alloy-silver-plated-ring/p/j572z0'
	},
	{
		id: 'golden-ad-ring', name: 'Elegant Adjustable AD Ring', category: 'Rings',
		description: 'Gold-tone adjustable ring with cubic zirconia detailing.',
		flipkart: 'https://www.flipkart.com/kriomya-elegant-adjustable-ad-ring-alloy-brass-cubic-zirconia-gold-plated/p/itm81fbe3fb1dbdc?pid=RNGHSP7WDV6WD6ZM',
		meesho: 'https://www.meesho.com/kriomya-elegant-adjustable-ad-ring-alloy-brass-cubic-zirconia-gold-plated-ring/p/j5758t'
	},
	{
		id: 'silver-floral-earrings', name: 'Silver Floral Pearl Drop Earrings', category: 'Earrings',
		description: 'Silver-tone floral drops finished with white artificial pearls.',
		flipkart: 'https://www.flipkart.com/kriomya-golden-floral-pearl-drop-earrings-alloy-drops-danglers/p/itm76771131d36fb?pid=ERGHSTP2QMDHVCTX',
		meesho: 'https://www.meesho.com/silver-floral-pearl-drop-earrings-pearl-alloy-drops-danglers/p/j56uw6'
	},
	{
		id: 'golden-floral-earrings', name: 'Golden Floral Pearl Drop Earrings', category: 'Earrings',
		description: 'Gold-tone floral drops finished with white artificial pearls.',
		flipkart: 'https://www.flipkart.com/kriomya-golden-floral-pearl-drop-earrings-alloy-drops-danglers/p/itmee232afed11c7?pid=ERGHSTP2MHCNVCCW', meesho: ''
	},
	{
		id: 'butterfly-armlet', name: 'Butterfly Floral Armlet', category: 'Armlets',
		description: 'Golden butterfly and floral details with a twisted-wire design.',
		flipkart: 'https://www.flipkart.com/kriomya-alloy-armlet/p/itm998653b2ce827?pid=BBAHSZ5MC8QQYMFS',
		meesho: 'https://www.meesho.com/butterfly-bajuband-and-armlet/p/j88bcy'
	},
	{
		id: 'heart-leaf-armlet', name: 'Golden Heart Leaf Bajuband', category: 'Armlets',
		description: 'An open golden armlet with heart and leaf motifs.',
		flipkart: 'https://www.flipkart.com/kriomya-alloy-armlet/p/itm48885d4a49088?pid=BBAHT84VTQJQS2UG',
		meesho: 'https://www.meesho.com/kriomya-golden-heart-leaf-bajuband/p/j8akbe'
	}
];

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
	catalogue.push({ ...listing, price: null, sample: false, images, imageSources: sources });
	console.log(`${listing.name}: ${images.length} photos`);
}
await writeFile(path.join(root, 'catalogue-data.js'), `const catalogue = ${JSON.stringify(catalogue, null, '\t')};\n`);
console.log(`Imported ${catalogue.length} products and ${catalogue.reduce((total, product) => total + product.images.length, 0)} photos.`);