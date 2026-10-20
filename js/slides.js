// Infoskjerm: auto-advancing slideshow on a fixed 1600x900 canvas.
// ← / → (or swipe) to browse, space to pause, F for fullscreen, 1–9 to jump.
const CANVAS_W = 1600;
const CANVAS_H = 900;
const IDLE_MS = 3000;

const show = document.getElementById('slideshow');
const stage = document.getElementById('stage');
const navList = document.getElementById('nav-list');
const pauseBtn = document.getElementById('slide-pause');
const slides = Array.from(stage.querySelectorAll('.slide'));
const defaultDuration = Number(show.dataset.duration) || 10;
const params = new URLSearchParams(location.search);

let current = 0;
let timer = null;
let paused = false;

/* ---------- Shared footer ---------- */
const footerTemplate = document.getElementById('slide-footer');
slides.filter(s => s.dataset.footer).forEach(slide => {
  slide.append(footerTemplate.content.cloneNode(true));
});

/* ---------- Scale the canvas to the window ---------- */
function fitStage() {
  const navHeight = parseFloat(getComputedStyle(show).getPropertyValue('--nav-height')) || 0;
  const scale = Math.min(window.innerWidth / CANVAS_W, (window.innerHeight - navHeight) / CANVAS_H);
  stage.style.setProperty('--scale', scale);
}
window.addEventListener('resize', fitStage);

/* ---------- Navigation overview ---------- */
const navItems = slides.map((slide, i) => {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-item';
  btn.dataset.index = i + 1;
  btn.textContent = slide.dataset.title || `Lysbilde ${i + 1}`;
  btn.title = btn.textContent;
  const progress = document.createElement('span');
  progress.className = 'progress';
  btn.append(progress);
  btn.addEventListener('click', () => goTo(i));
  li.append(btn);
  navList.append(li);
  return btn;
});

function durationOf(slide) {
  return (Number(slide.dataset.duration) || defaultDuration) * 1000;
}

function goTo(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    const active = i === current;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', String(!active));
  });

  const duration = durationOf(slides[current]);
  navItems.forEach((item, i) => {
    item.removeAttribute('aria-current');
    // Restart the progress animation on the newly active item
    const bar = item.querySelector('.progress');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = '';
    if (i === current) {
      item.setAttribute('aria-current', 'true');
      item.style.setProperty('--duration', `${duration}ms`);
    }
  });
  schedule();
}

function schedule() {
  clearTimeout(timer);
  if (!paused) timer = setTimeout(() => goTo(current + 1), durationOf(slides[current]));
}

function setPaused(value) {
  paused = value;
  show.classList.toggle('is-paused', paused);
  pauseBtn.setAttribute('aria-pressed', String(paused));
  pauseBtn.setAttribute('aria-label', paused ? 'Fortsett' : 'Pause');
  // Resuming starts the current slide's time over
  if (!paused) goTo(current);
  else clearTimeout(timer);
}

document.getElementById('slide-prev').addEventListener('click', () => goTo(current - 1));
document.getElementById('slide-next').addEventListener('click', () => goTo(current + 1));
pauseBtn.addEventListener('click', () => setPaused(!paused));

/* ---------- Fullscreen ---------- */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
document.getElementById('slide-fullscreen').addEventListener('click', toggleFullscreen);

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  switch (e.key) {
    case 'ArrowRight': case 'PageDown': goTo(current + 1); break;
    case 'ArrowLeft': case 'PageUp': goTo(current - 1); break;
    case 'Home': goTo(0); break;
    case 'End': goTo(slides.length - 1); break;
    case ' ':
      if (e.target instanceof Element && e.target.closest('button')) return; // let space press the focused button
      setPaused(!paused);
      break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'h': case 'H':
      show.classList.toggle('nav-hidden');
      fitStage();
      break;
    default:
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= slides.length) goTo(Number(e.key) - 1);
      else return;
  }
  e.preventDefault();
});

/* ---------- Touch: swipe left/right ---------- */
let touchStart = null;
stage.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
stage.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) goTo(current + (dx < 0 ? 1 : -1));
});

/* ---------- Kiosk niceties ---------- */
// Hide the mouse pointer when it hasn't moved for a while
let idleTimer = null;
function wake() {
  document.body.classList.remove('hide-cursor');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('hide-cursor'), IDLE_MS);
}
['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(type => {
  document.addEventListener(type, wake, { passive: true });
});

// Keep the screen from going to sleep while the slideshow is showing
let wakeLock = null;
async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not allowed/supported */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

// ?nav=0 hides the navigation bar (H toggles it)
if (params.get('nav') === '0') show.classList.add('nav-hidden');

// ?lysbilde=3 starts on slide 3 (handy for testing)
const startAt = parseInt(params.get('lysbilde'), 10);

fitStage();
goTo(startAt > 0 ? startAt - 1 : 0);
wake();
requestWakeLock();
