const FACEBOOK_PAGE_URL = 'https://www.facebook.com/OdalRollespillklubb';

function loadFacebookEmbed(container) {
  container.innerHTML = `
    <div class="fb-page"
      data-href="${FACEBOOK_PAGE_URL}"
      data-tabs="timeline"
      data-width="500"
      data-height="500"
      data-small-header="true"
      data-adapt-container-width="true"
      data-hide-cover="false"
      data-show-facepile="false">
    </div>
  `;

  if (window.FB) {
    window.FB.XFBML.parse(container);
    return;
  }

  if (!document.getElementById('fb-root')) {
    const fbRoot = document.createElement('div');
    fbRoot.id = 'fb-root';
    document.body.prepend(fbRoot);
  }

  if (!document.getElementById('facebook-jssdk')) {
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/nb_NO/sdk.js#xfbml=1&version=v19.0';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }
}

// Discord's server widget (who's online + join button). The iframe sets
// Discord's own cookies, so it is consent-gated just like Facebook.
const DISCORD_WIDGET_URL = 'https://discord.com/widget?id=977647023673180190&theme=dark';

function loadDiscordWidget(container) {
  container.innerHTML = `
    <iframe src="${DISCORD_WIDGET_URL}"
      title="Discord-serveren vår: hvem som er pålogget"
      width="350" height="500"
      allowtransparency="true" frameborder="0" loading="lazy"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts">
    </iframe>
  `;
}

// Loading is gated behind cookie consent (see js/consent.js), which calls
// loadFacebookEmbed(...) / loadDiscordWidget(...) once the visitor accepts cookies.

// Discord news is rendered by the ORKLib widget (tirco.tv/orklib), loaded
// directly from index.html into the [data-orklib-news] element.
