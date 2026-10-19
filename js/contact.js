// Skjemaet sendes via Formspree (formspree.io), som videresender det som e-post.
// Mottakeradressen settes i Formspree-kontoen, ikke her. Selve adressen står i
// skjemaets action-attributt i index.html, så skjemaet virker også uten JavaScript.

const contactForm = document.querySelector('.contact-form');
const contactMessage = document.getElementById('contact-form-message');

function showContactMessage(text, ok) {
  contactMessage.textContent = text;
  contactMessage.classList.toggle('form-message--error', !ok);
  contactMessage.classList.toggle('form-message--success', ok);
  contactMessage.hidden = false;
}

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('.btn-send');
    submitBtn.disabled = true;

    const data = new FormData(contactForm);
    data.append('_subject', '[Kontaktskjema] ' + data.get('emne'));

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        showContactMessage('Takk for din henvendelse! Vi svarer så snart vi kan.', true);
        contactForm.reset();
      } else {
        showContactMessage('Noe gikk galt. Prøv igjen senere, eller send oss en e-post direkte.', false);
      }
    } catch (err) {
      showContactMessage('Noe gikk galt. Prøv igjen senere, eller send oss en e-post direkte.', false);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
