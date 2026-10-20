const header = document.getElementById('site-header');
const menuToggle = document.getElementById('menu-toggle');
const mainNav = document.getElementById('main-nav');

function setScrolled() {
  header.classList.toggle('scrolled', window.scrollY > 20);
}
setScrolled();
window.addEventListener('scroll', setScrolled, { passive: true });

function setMenuOpen(isOpen) {
  mainNav.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Lukk meny' : 'Åpne meny');
  // Keep the page behind the open mobile menu from scrolling
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  if (mainNav.classList.contains('open')) setMenuOpen(false);
}

menuToggle.addEventListener('click', () => {
  setMenuOpen(!mainNav.classList.contains('open'));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// Tapping outside the open menu, or pressing Escape, closes it
document.addEventListener('click', e => {
  if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
});
// Rotating a phone/resizing past the mobile breakpoint shouldn't leave the page locked
window.matchMedia('(min-width: 861px)').addEventListener('change', closeMenu);

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
