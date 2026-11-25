const bedding = catalogueSettings.featuredBedsheets.map(id => catalogue.find(product => product.id === id && product.category === 'Bedsheets')).filter(Boolean);
if (!bedding.length) bedding.push(...catalogue.filter(product => product.category === 'Bedsheets'));
let sceneIndex = 0;
const sceneImage = document.getElementById('showcase-image');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let sceneTimer;
let autoplayPaused = reducedMotion.matches;
let showcaseVisible = true;
const showcase = document.querySelector('.showcase');
const autoplayButton = document.createElement('button');
autoplayButton.type = 'button';
autoplayButton.id = 'scene-autoplay';
autoplayButton.className = 'icon-button';
document.querySelector('.scene-controls').append(autoplayButton);

function updateAutoplayButton() {
	const label = autoplayPaused ? 'Play bedsheet slideshow' : 'Pause bedsheet slideshow';
	autoplayButton.setAttribute('aria-label', label);
	autoplayButton.title = label;
	autoplayButton.replaceChildren(createIcon(autoplayPaused ? 'play' : 'pause'));
	autoplayButton.hidden = bedding.length < 2;
	refreshIcons();
}
function scheduleScene() {
	clearTimeout(sceneTimer);
	if (autoplayPaused || bedding.length < 2 || document.hidden || !showcaseVisible || dialog.open) return;
	sceneTimer = setTimeout(() => selectScene(sceneIndex + 1), 3000);
}
autoplayButton.addEventListener('click', () => {
	autoplayPaused = !autoplayPaused;
	updateAutoplayButton();
	scheduleScene();
});
showcase.addEventListener('focusin', event => {
	if (event.target !== autoplayButton && event.target.matches(':focus-visible')) {
		autoplayPaused = true;
		updateAutoplayButton();
		scheduleScene();
	}
});
document.addEventListener('visibilitychange', scheduleScene);
dialog.addEventListener('close', scheduleScene);
new MutationObserver(scheduleScene).observe(dialog, { attributes: true, attributeFilter: ['open'] });
new IntersectionObserver(entries => {
	showcaseVisible = entries[0].isIntersecting;
	scheduleScene();
}).observe(showcase);
updateAutoplayButton();

function selectScene(index) {
	if (!bedding.length) return;
	sceneIndex = (index + bedding.length) % bedding.length;
	const product = bedding[sceneIndex];
	sceneImage.src = productImages(product)[0];
	sceneImage.alt = product.name;
	document.getElementById('scene-name').textContent = product.name;
	document.getElementById('scene-number').textContent = `${String(sceneIndex + 1).padStart(2, '0')} / ${String(bedding.length).padStart(2, '0')}`;
	document.querySelectorAll('.scene-option').forEach((button, position) => button.setAttribute('aria-pressed', String(position === sceneIndex)));
	if (!reducedMotion.matches) sceneImage.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
	scheduleScene();
}
bedding.forEach((product, index) => {
	const button = document.createElement('button');
	button.className = 'scene-option';
	button.type = 'button';
	button.title = product.name;
	button.setAttribute('aria-label', product.name);
	const image = document.createElement('img');
	image.src = productImages(product)[0];
	image.alt = '';
	button.append(image);
	button.addEventListener('click', () => selectScene(index));
	document.getElementById('scene-options').append(button);
});
document.getElementById('scene-prev').addEventListener('click', () => selectScene(sceneIndex - 1));
document.getElementById('scene-next').addEventListener('click', () => selectScene(sceneIndex + 1));
document.getElementById('scene-detail').addEventListener('click', event => { if (bedding.length) openProduct(bedding[sceneIndex], event.currentTarget); });
document.querySelector('.showcase').hidden = !bedding.length;
selectScene(0);

function chooseCollection(collection) {
	activeCategory = collection;
	searchInput.value = '';
	document.querySelectorAll('#categories .category').forEach((button, index) => button.setAttribute('aria-pressed', String(categories[index] === collection)));
	renderProducts();
}
document.querySelectorAll('a[data-collection]').forEach(link => link.addEventListener('click', () => chooseCollection(link.dataset.collection)));
document.querySelector('.light-link').addEventListener('click', () => chooseCollection('Bedsheets'));
const jewelleryCategories = ['All jewellery', ...new Set(catalogue.filter(product => product.category !== 'Bedsheets').map(product => product.category))];
jewelleryCategories.forEach(category => {
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = category;
	button.setAttribute('aria-pressed', String(category === activeSubcategory));
	button.addEventListener('click', () => {
		activeSubcategory = category;
		document.querySelectorAll('#subcategories button').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
		renderProducts();
	});
	document.getElementById('subcategories').append(button);
});
searchInput.addEventListener('input', () => {
	if (searchInput.value.trim() && activeCategory !== 'All pieces') {
		activeCategory = 'All pieces';
		document.querySelectorAll('#categories .category').forEach((button, index) => button.setAttribute('aria-pressed', String(categories[index] === activeCategory)));
		renderProducts();
	}
});
const jewellery = catalogue.find(product => product.id === catalogueSettings.featuredJewellery) || catalogue.find(product => product.category !== 'Bedsheets');
if (jewellery) {
	document.getElementById('jewellery-image').src = productImages(jewellery)[0];
	document.getElementById('jewellery-image').alt = jewellery.name;
	document.getElementById('jewellery-name').textContent = jewellery.name;
	document.getElementById('jewellery-feature').addEventListener('click', event => openProduct(jewellery, event.currentTarget));
} else document.querySelector('.jewellery-invitation').hidden = true;

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
	if (entry.isIntersecting) { entry.target.classList.remove('pending'); revealObserver.unobserve(entry.target); }
}), { threshold: .12 });
document.querySelectorAll('.intro,.jewellery-invitation,.closing').forEach(section => {
	section.classList.add('reveal');
	if (!reducedMotion.matches) section.classList.add('pending');
	revealObserver.observe(section);
});
let scrollScheduled = false;
function updateScenePosition() {
	const bounds = document.querySelector('.showcase').getBoundingClientRect();
	sceneImage.style.transform = !reducedMotion.matches && bounds.bottom > 0 ? `translateY(${Math.min(Math.max(-bounds.top, 0) * .12, 80)}px)` : 'none';
	scrollScheduled = false;
}
addEventListener('scroll', () => {
	if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScenePosition); }
}, { passive: true });
reducedMotion.addEventListener('change', () => {
	autoplayPaused = reducedMotion.matches;
	updateAutoplayButton();
	scheduleScene();
	if (reducedMotion.matches) document.querySelectorAll('.reveal.pending').forEach(section => section.classList.remove('pending'));
	updateScenePosition();
});
refreshIcons();