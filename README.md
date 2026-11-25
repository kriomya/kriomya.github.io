# KriOmya catalogue

A static catalogue linking customers to Amazon India, Flipkart and Meesho. Open [index.html](index.html) in your browser to preview it; no server or build is required.

## Storefront arrangement

Bed linen opens first. Jewellery has its own collection and category filters; All pieces shows the complete catalogue with bedding first. Search includes all products. Products follow the configured featured order; there are no saved favourites or customer sorting controls.

Use [catalogue-settings.js](catalogue-settings.js) to manage presentation without editing HTML:

- `featuredBedsheets`: product IDs in the order shown in the switchable bedroom showcase.
- `featuredJewellery`: the product ID for the jewellery feature below the catalogue.
- `covers`: optional image URLs or local paths, keyed by product ID, for the first product photo. The existing galleries remain intact.
- `collections`: display labels, headings and descriptions. Keep the existing collection keys, which control filtering.

New products still require only an entry in [catalogue-data.js](catalogue-data.js). They appear automatically in the appropriate collection; add a bedsheet's ID to `featuredBedsheets` only when it should also appear in the showcase. Featured order within the catalogue follows the data file, with bedding prioritised in All pieces.

The visual styling is in [storefront.css](storefront.css); showcase navigation, favourites navigation and scroll effects are in [storefront.js](storefront.js). Scroll remains native, the showcase never auto-advances, and reduced-motion preferences disable parallax and reveal animations. Publish these files and [catalogue-settings.js](catalogue-settings.js) with the HTML.

## Add a product

Edit only [catalogue-data.js](catalogue-data.js). Add an object inside `const catalogue = [ ... ];`, separated from the next object by a comma:

```js
{
	"id": "my-new-product",
	"name": "My New Product",
	"category": "Necklaces",
	"description": "A short, accurate product description.",
	"images": ["https://your-image-host.com/product-photo.jpg"],
	"amazon": "https://www.amazon.in/dp/YOUR_ASIN",
	"flipkart": "",
	"meesho": ""
},
```

Replace the example URLs with your real URLs before publishing. Use a direct HTTPS **image** URL in `images`, not a marketplace page or sharing-page URL. You can also use a local path under `assets/products/`. Only use images you own or have permission to display.

- Give each product a unique lowercase, hyphen-separated `id`.
- The first image is the cover; extra images become gallery thumbnails.
- Categories are generated automatically. A new category needs no HTML change.
- Fill only the marketplaces where that exact product is listed; omit others or leave them empty.
- Use one primary listing URL per marketplace for each product. The website shows at most one button per marketplace, even for older entries containing URL arrays. Keep different colours, designs and bundles as separate products.
- `price` is optional. Omit it or use `null` to show "See price on marketplace". A number displays a manually maintained INR price, not a live quote.
- `sample: true` disables shopping links for a preview. Omit it for a real listing.
- Product order controls Featured order. Delete an object to remove a product.
- `imageSources` is generated provenance for downloaded photos; it is not required when adding a product.

Refresh the browser to see local edits. Direct image URLs work without running the importer, but remote hosts can change or block them.

## Optional image download

Requires Node.js 22.19+ or 24+. Downloading stores photos in this repository so customer visits do not depend on marketplace image servers:

```sh
node --use-system-ca import-catalogue.mjs
```

The importer reads the same catalogue, downloads direct URLs, replaces them with local paths, and retains their original URLs in `imageSources`. It preserves names, prices, marketplace links, other custom fields and existing photos. Avoid editing the catalogue while an import runs.

To try extracting a gallery from a listing, set `images` to `[]` and run the importer. To fetch newly added listing galleries for an existing product:

```sh
node --use-system-ca import-catalogue.mjs --refresh --only=my-new-product
```

Multiple IDs can be comma-separated. `--refresh` adds photos, never removes existing ones. Automated extraction is best-effort: marketplace layouts and access restrictions change. On failure, the importer reports the product and exits nonzero, retaining existing images and failed direct URLs. Add verified direct image URLs and run without `--refresh` to avoid the blocked page. Review any errors before publishing.

`--use-system-ca` uses your operating system's trusted certificates. Do not disable TLS verification to work around certificate errors.

## Check and publish

```sh
node import-catalogue.mjs --check
node --test catalogue.test.mjs
```

The first command checks product fields, unique IDs, marketplace hosts and local image paths without fetching or changing anything. It also rejects empty galleries. The tests cover marketplace buttons and importer preservation/failure behavior. Neither command guarantees a marketplace remains in stock or that a remote image URL still works; preview the changed products too.

To make changes public, commit and push the changed catalogue and any new image files to the branch configured for GitHub Pages in `kriomya/kriomya.github.io`. For this update, include the changed HTML and importer as well. Check the Pages deployment in GitHub, then verify https://kriomya.com/.

Editing a local file does **not** publish it. There is no admin backend or automatic marketplace synchronization, and no credentials should be added to these public files.

## Import notes: 25 November 2026

- 21 distinct products, including five Amazon bedsheet sets, with 159 gallery photos.
- All 13 supplied Flipkart listing URLs are represented, including both pink-heart pendant colours.
- 15 primary Meesho links are retained, including the existing floral armlet listing. All products use one link per marketplace; alternate listing buttons have been removed. Open Gold Heart Pendant uses only `jc8piv` and its four-photo gallery; the overlapping `jc8som` listing and photo set were removed from the catalogue.
- Some Amazon pages reported unavailable stock or delivery restrictions during retrieval. Links are retained, but the site does not claim live stock or copy temporary marketplace prices.
- Meesho page extraction was intermittent; verified direct gallery URLs were used successfully instead.
- This workspace update has not been committed, pushed or deployed.