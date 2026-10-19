const header = document.getElementById('site-header');
const menuToggle = document.getElementById('menu-toggle');
const mainNav = document.getElementById('main-nav');

function setScrolled() {
  header.classList.toggle('scrolled', window.scrollY > 20);
}
setScrolled();
window.addEventListener('scroll', setScrolled, { passive: true });

function closeMenu() {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// Stretch each wavy divider to the text width of the heading right above it,
// rounded to whole waves so the line never ends mid-curve.
const WAVE_WIDTH = 40;

function sizeWavyDividers() {
  document.querySelectorAll('.wavy').forEach(wavy => {
    const heading = wavy.previousElementSibling;
    if (!heading || !/^H[1-3]$/.test(heading.tagName)) return;

    const range = document.createRange();
    range.selectNodeContents(heading);
    const textWidth = range.getBoundingClientRect().width;
    const maxWaves = Math.floor(wavy.parentElement.clientWidth / WAVE_WIDTH);
    const waves = Math.min(maxWaves, Math.max(4, Math.round(textWidth / WAVE_WIDTH)));
    wavy.style.width = waves * WAVE_WIDTH + 'px';
  });
}

sizeWavyDividers();
document.fonts?.ready.then(sizeWavyDividers);
window.addEventListener('resize', sizeWavyDividers);
