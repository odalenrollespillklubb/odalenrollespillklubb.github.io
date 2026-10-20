const CONSENT_KEY = 'ork_cookie_consent';

const cookieBanner = document.getElementById('cookie-banner');

// Third-party embeds that set cookies and therefore wait for consent
const consentEmbeds = [
  { placeholder: document.getElementById('fb-embed-placeholder'), load: loadFacebookEmbed, what: 'vise Facebook-feeden her' },
  { placeholder: document.getElementById('discord-widget-placeholder'), load: loadDiscordWidget, what: 'vise hvem som er pålogget Discord' },
].filter(embed => embed.placeholder);

function getConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  applyConsent(value);
}

function bindAcceptLinks() {
  document.querySelectorAll('.embed-accept-link').forEach(link => {
    link.addEventListener('click', () => setConsent('accepted'));
  });
}

function applyConsent(value) {
  if (cookieBanner) cookieBanner.hidden = true;

  consentEmbeds.forEach(({ placeholder, load, what }) => {
    if (value === 'accepted') {
      load(placeholder);
      return;
    }

    // declined, or no decision yet: (re-)show the consent message
    placeholder.innerHTML = `
      <p class="embed-consent-message">
        Vi trenger ditt samtykke til cookies for å ${what}.
        <button class="link-btn embed-accept-link">Godta cookies</button>
      </p>
    `;
  });
  bindAcceptLinks();
}

function showBanner() {
  if (cookieBanner) cookieBanner.hidden = false;
}

document.getElementById('cookie-accept')?.addEventListener('click', () => setConsent('accepted'));
document.getElementById('cookie-decline')?.addEventListener('click', () => setConsent('declined'));
document.getElementById('open-cookie-settings')?.addEventListener('click', showBanner);

bindAcceptLinks();

const existingConsent = getConsent();
if (existingConsent) {
  applyConsent(existingConsent);
} else {
  showBanner();
}
