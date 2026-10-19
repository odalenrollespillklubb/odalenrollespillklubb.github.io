const FACEBOOK_PAGE_URL = 'https://www.facebook.com/OdalenRollespillklubb';

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

// Loading is gated behind cookie consent (see js/consent.js), which calls
// loadFacebookEmbed(...) directly once the visitor accepts cookies.

// Discord news is rendered by the ORKLib widget (tirco.tv/orklib), loaded
// directly from index.html into the [data-orklib-news] element.
