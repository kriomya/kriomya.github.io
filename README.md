# KriOmya catalogue

The GitHub Pages site reads products from `catalogue-data.js`. To add a product, edit that file in GitHub and copy an existing entry inside the array.

- Give it a unique `id`, a `name`, a `category`, and a `description`. Categories become filters automatically.
- Add an `amazon`, `flipkart`, or `meesho` field with the HTTPS link to that product. Include only the marketplaces that sell the item.
- Put the direct HTTPS image links (or paths to uploaded images in `assets/products/`) in the `images` array. The first image is the cover. Open each URL on its own to check that it displays the right photo.
- Use double quotes and separate entries with commas. Leave out `price` to show “See price on marketplace.”

Once the change reaches `main` and GitHub Pages deploys it, open [kriomya.com](https://kriomya.com/) and check the card, its gallery, and the marketplace buttons. Adding an item by hand requires no import or build step. The optional Flipkart and Meesho image importer reads the same catalogue and preserves manually managed galleries.
