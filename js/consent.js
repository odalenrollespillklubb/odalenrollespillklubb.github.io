const CONSENT_KEY = 'ork_cookie_consent';

const cookieBanner = document.getElementById('cookie-banner');
const fbPlaceholder = document.getElementById('fb-embed-placeholder');

function getConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  applyConsent(value);
}

function bindAcceptLink() {
  const link = document.getElementById('fb-embed-accept-link');
  if (link) link.addEventListener('click', () => setConsent('accepted'));
}

function applyConsent(value) {
  if (cookieBanner) cookieBanner.hidden = true;
  if (!fbPlaceholder) return;

  if (value === 'accepted') {
    loadFacebookEmbed(fbPlaceholder);
    return;
  }

  // declined, or no decision yet: (re-)show the consent message
  fbPlaceholder.innerHTML = `
    <p class="embed-consent-message" id="fb-embed-consent-message">
      Vi trenger ditt samtykke til cookies for å vise Facebook-feeden her.
      <button class="link-btn" id="fb-embed-accept-link">Godta cookies</button>
    </p>
  `;
  bindAcceptLink();
}

function showBanner() {
  if (cookieBanner) cookieBanner.hidden = false;
}

document.getElementById('cookie-accept')?.addEventListener('click', () => setConsent('accepted'));
document.getElementById('cookie-decline')?.addEventListener('click', () => setConsent('declined'));
document.getElementById('open-cookie-settings')?.addEventListener('click', showBanner);

bindAcceptLink();

const existingConsent = getConsent();
if (existingConsent) {
  applyConsent(existingConsent);
} else {
  showBanner();
}
